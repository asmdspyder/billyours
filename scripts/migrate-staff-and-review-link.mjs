import fs from "fs";
import { neon, neonConfig } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2]?.trim();
    }
  }
}

const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const url = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

const originalFetch = globalThis.fetch;
neonConfig.fetchFunction = async (fetchUrl, options) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await originalFetch(fetchUrl, options);
      if ((response.status === 503 || response.status === 504) && attempts < 2) {
        attempts++;
        await new Promise((r) => setTimeout(r, 400 * attempts));
        continue;
      }
      return response;
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempts));
    }
  }
  return originalFetch(fetchUrl, options);
};

const sql = neon(url);

async function runMigration() {
  console.log("Applying Migration: Google Review Link and Staff Members...");

  // 1. Add google_review_link to business_accounts
  await sql`
    ALTER TABLE business_accounts
      ADD COLUMN IF NOT EXISTS google_review_link VARCHAR(500);
  `;
  console.log("✓ Added google_review_link to business_accounts");

  // 2. Create staff_members table
  await sql`
    CREATE TABLE IF NOT EXISTS staff_members (
      id VARCHAR(64) PRIMARY KEY,
      account_id VARCHAR(64) NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;
  console.log("✓ Created staff_members table");

  // Add index on staff_members
  await sql`
    CREATE INDEX IF NOT EXISTS idx_staff_account_active ON staff_members(account_id, is_active);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_staff_account_name ON staff_members(account_id, name);
  `;

  // 3. Add staff_id and staff_name_snapshot to bills
  await sql`
    ALTER TABLE bills
      ADD COLUMN IF NOT EXISTS staff_id VARCHAR(64) REFERENCES staff_members(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS staff_name_snapshot VARCHAR(255);
  `;
  console.log("✓ Added staff_id and staff_name_snapshot to bills");

  // 4. Backfill default staff for all existing business accounts
  const accounts = await sql`
    SELECT id, owner_name, business_email, business_phone FROM business_accounts;
  `;
  for (const acc of accounts) {
    const existingStaff = await sql`
      SELECT id FROM staff_members WHERE account_id = ${acc.id} LIMIT 1;
    `;
    if (existingStaff.length === 0) {
      const staffId = "stf_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      await sql`
        INSERT INTO staff_members (id, account_id, name, email, phone, is_active, is_default, created_at, updated_at)
        VALUES (${staffId}, ${acc.id}, ${acc.owner_name || "Primary Staff"}, ${acc.business_email || null}, ${acc.business_phone || null}, true, true, NOW(), NOW())
        ON CONFLICT DO NOTHING;
      `;
    }
  }
  console.log(`✓ Seeded default staff for ${accounts.length} business accounts`);

  // 5. Update demo account with sample GSTIN and Google Review Link
  await sql`
    UPDATE business_accounts
    SET
      gstin = COALESCE(gstin, '29AABCU9603R1ZM'),
      google_review_link = 'https://g.page/r/chaibites-indiranagar/review'
    WHERE id = 'acc_demo_sharma';
  `;
  console.log("✓ Updated demo account with sample GSTIN & Google Review Link");

  console.log("Migration completed successfully!");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
