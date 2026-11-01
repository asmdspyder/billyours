import { neon, neonConfig } from "@neondatabase/serverless";
import fs from "fs";

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) process.env[match[1]] = match[2]?.trim();
  }
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is required to execute migration.");
}

const connectionString = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;

const originalFetch = globalThis.fetch;
neonConfig.fetchFunction = async (fetchUrl, options) => {
  let attempts = 0;
  while (attempts < 5) {
    try {
      const response = await originalFetch(fetchUrl, options);
      if ((response.status === 503 || response.status === 504) && attempts < 4) {
        attempts++;
        await new Promise((r) => setTimeout(r, 200 * attempts));
        continue;
      }
      return response;
    } catch (err) {
      attempts++;
      if (attempts >= 5) throw err;
      await new Promise((r) => setTimeout(r, 300 * attempts));
    }
  }
  return originalFetch(fetchUrl, options);
};

const sql = neon(connectionString);
const MIGRATION_ID = "0003_financial_retention_and_protection";

export async function runMigration() {
  console.log(`[MIGRATION] Checking status for: ${MIGRATION_ID}`);

  // 1. Ensure migrations tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  const existing = await sql`
    SELECT id, applied_at FROM _schema_migrations WHERE id = ${MIGRATION_ID}
  `;

  if (existing.length > 0) {
    console.log(`[MIGRATION] ${MIGRATION_ID} was already applied on ${existing[0].applied_at}. Skipping.`);
    return { applied: false, reason: "ALREADY_APPLIED" };
  }

  console.log(`[MIGRATION] Applying ${MIGRATION_ID}...`);

  // 2. Drop cascading foreign key constraint on bills.account_id
  await sql`
    ALTER TABLE bills
    DROP CONSTRAINT IF EXISTS bills_account_id_business_accounts_id_fk;
  `;
  console.log("[MIGRATION] Dropped cascading constraint bills_account_id_business_accounts_id_fk.");

  // 3. Add ON DELETE RESTRICT foreign key constraint to protect historical bills from account deletion
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_bills_business_account' AND table_name = 'bills'
      ) THEN
        ALTER TABLE bills
        ADD CONSTRAINT fk_bills_business_account
        FOREIGN KEY (account_id) REFERENCES business_accounts (id)
        ON DELETE RESTRICT;
      END IF;
    END $$;
  `;
  console.log("[MIGRATION] Added ON DELETE RESTRICT foreign key constraint fk_bills_business_account.");

  // 4. Index on business_accounts.archived_at
  await sql`
    CREATE INDEX IF NOT EXISTS idx_business_accounts_archived_at
    ON business_accounts (archived_at);
  `;
  console.log("[MIGRATION] Created index idx_business_accounts_archived_at.");

  // 5. Record successful migration
  await sql`
    INSERT INTO _schema_migrations (id, applied_at)
    VALUES (${MIGRATION_ID}, NOW());
  `;

  console.log(`[MIGRATION] Successfully applied ${MIGRATION_ID}.`);
  return { applied: true };
}

if (process.argv[1] && process.argv[1].endsWith("0003_financial_retention_and_protection.mjs")) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
