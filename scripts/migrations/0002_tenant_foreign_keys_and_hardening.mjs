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
const MIGRATION_ID = "0002_tenant_foreign_keys_and_hardening";

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

  // 2. Add payload_hash to bills for cryptographic idempotency binding
  await sql`
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64);
  `;
  console.log("[MIGRATION] Added payload_hash column to bills table.");

  // 3. Composite unique index for customer atomic upsert by phone per tenant
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_account_phone_unique
    ON customers (account_id, normalized_phone)
    WHERE archived_at IS NULL AND normalized_phone IS NOT NULL;
  `;
  console.log("[MIGRATION] Created idx_customers_account_phone_unique index.");

  // 4. Harden fk_bill_items_account_item with ON DELETE SET NULL (item_id)
  await sql`
    ALTER TABLE bill_items DROP CONSTRAINT IF EXISTS fk_bill_items_account_item;
  `;
  await sql`
    ALTER TABLE bill_items
    ADD CONSTRAINT fk_bill_items_account_item
    FOREIGN KEY (account_id, item_id)
    REFERENCES items (account_id, id)
    ON DELETE SET NULL (item_id);
  `;
  console.log("[MIGRATION] Updated fk_bill_items_account_item with ON DELETE SET NULL (item_id).");

  // 5. Composite foreign key bills -> customers (account_id, customer_id)
  await sql`
    ALTER TABLE bills DROP CONSTRAINT IF EXISTS fk_bills_account_customer;
  `;
  await sql`
    ALTER TABLE bills
    ADD CONSTRAINT fk_bills_account_customer
    FOREIGN KEY (account_id, customer_id)
    REFERENCES customers (account_id, id)
    ON DELETE SET NULL (customer_id);
  `;
  console.log("[MIGRATION] Added composite foreign key: fk_bills_account_customer.");

  // 6. Composite foreign key bills -> staff_members (account_id, staff_id)
  await sql`
    ALTER TABLE bills DROP CONSTRAINT IF EXISTS fk_bills_account_staff;
  `;
  await sql`
    ALTER TABLE bills
    ADD CONSTRAINT fk_bills_account_staff
    FOREIGN KEY (account_id, staff_id)
    REFERENCES staff_members (account_id, id)
    ON DELETE SET NULL (staff_id);
  `;
  console.log("[MIGRATION] Added composite foreign key: fk_bills_account_staff.");

  // 7. Enable pg_trgm extension & GIN indexes for fast text search
  await sql`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bills_bill_number_trgm
    ON bills USING gin (bill_number gin_trgm_ops);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bills_cust_name_trgm
    ON bills USING gin (customer_name_snapshot gin_trgm_ops);
  `;
  console.log("[MIGRATION] Created pg_trgm GIN text search indexes on bills.");

  // 8. Record migration in _schema_migrations
  await sql`
    INSERT INTO _schema_migrations (id, applied_at)
    VALUES (${MIGRATION_ID}, NOW());
  `;

  console.log(`[MIGRATION] Successfully completed and recorded: ${MIGRATION_ID}`);
  return { applied: true, migrationId: MIGRATION_ID };
}

if (process.argv[1]?.endsWith("0002_tenant_foreign_keys_and_hardening.mjs")) {
  runMigration()
    .then((r) => {
      console.log("[MIGRATION RESULT]", r);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[MIGRATION FAILED]", err);
      process.exit(1);
    });
}
