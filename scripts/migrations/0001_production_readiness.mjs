import { neon, neonConfig } from "@neondatabase/serverless";
import fs from "fs";

// Load environment connection string
if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2]?.trim();
    }
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
const sql = neon(connectionString);

const MIGRATION_ID = "0001_production_readiness";

export async function runMigration() {
  console.log(`[MIGRATION] Checking migration status for: ${MIGRATION_ID}`);

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

  // 2. Add idempotency_key to bills
  await sql`
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
  `;

  // 3. Composite unique index for idempotency enforcement (account_id, idempotency_key)
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_account_idempotency
    ON bills (account_id, idempotency_key);
  `;

  // 4. Parent composite unique constraints for tenant-aware foreign keys
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_account_id
    ON customers (account_id, id);
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_account_id
    ON staff_members (account_id, id);
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_items_account_id
    ON items (account_id, id);
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_account_id
    ON bills (account_id, id);
  `;

  // 5. Composite foreign keys on bill_items (ensures invoice items can never point to another tenant's bill or item)
  const existingFkBill = await sql`
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'bill_items' AND constraint_name = 'fk_bill_items_account_bill';
  `;
  if (existingFkBill.length === 0) {
    try {
      await sql`
        ALTER TABLE bill_items
        ADD CONSTRAINT fk_bill_items_account_bill
        FOREIGN KEY (account_id, bill_id)
        REFERENCES bills (account_id, id)
        ON DELETE CASCADE;
      `;
      console.log("[MIGRATION] Added composite foreign key: fk_bill_items_account_bill");
    } catch (err) {
      console.warn("[MIGRATION] Notice on fk_bill_items_account_bill:", err.message);
    }
  }

  const existingFkItem = await sql`
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'bill_items' AND constraint_name = 'fk_bill_items_account_item';
  `;
  if (existingFkItem.length === 0) {
    try {
      await sql`
        ALTER TABLE bill_items
        ADD CONSTRAINT fk_bill_items_account_item
        FOREIGN KEY (account_id, item_id)
        REFERENCES items (account_id, id)
        ON DELETE SET NULL;
      `;
      console.log("[MIGRATION] Added composite foreign key: fk_bill_items_account_item");
    } catch (err) {
      console.warn("[MIGRATION] Notice on fk_bill_items_account_item:", err.message);
    }
  }

  // 6. Optimized query indexes
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bills_account_completed_status
    ON bills (account_id, completed_at DESC, status);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_items_account_active_name
    ON items (account_id, is_active, name);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bill_items_account_bill
    ON bill_items (account_id, bill_id);
  `;

  // 7. Drop redundant email index (unique constraint already has dedicated index)
  await sql`
    DROP INDEX IF EXISTS idx_users_email;
  `;
  console.log("[MIGRATION] Dropped redundant idx_users_email index.");

  // 8. Ensure paid_setup_requests table exists
  await sql`
    CREATE TABLE IF NOT EXISTS paid_setup_requests (
      id VARCHAR(64) PRIMARY KEY,
      plan VARCHAR(50) NOT NULL,
      business_name VARCHAR(255) NOT NULL,
      contact_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      city VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  // 9. Record migration in _schema_migrations
  await sql`
    INSERT INTO _schema_migrations (id, applied_at)
    VALUES (${MIGRATION_ID}, NOW());
  `;

  console.log(`[MIGRATION] Successfully completed and recorded: ${MIGRATION_ID}`);
  return { applied: true, migrationId: MIGRATION_ID };
}

if (process.argv[1]?.endsWith("0001_production_readiness.mjs")) {
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
