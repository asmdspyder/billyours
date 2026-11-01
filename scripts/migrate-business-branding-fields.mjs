import fs from "fs";
import { neon, neonConfig } from "@neondatabase/serverless";

// Read .env if process.env.DATABASE_URL is not set
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
  console.log("Applying business branding migration (FSSAI, Website, Facebook, Instagram)...");

  await sql`
    ALTER TABLE business_accounts
      ADD COLUMN IF NOT EXISTS fssai VARCHAR(50),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS facebook VARCHAR(100),
      ADD COLUMN IF NOT EXISTS instagram VARCHAR(100);
  `;

  console.log("Columns added successfully!");

  // Verify
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'business_accounts'
      AND column_name IN ('fssai', 'website', 'facebook', 'instagram', 'gstin', 'business_phone', 'business_email');
  `;
  console.log("Verified columns in business_accounts:", cols.map((c) => c.column_name));
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
