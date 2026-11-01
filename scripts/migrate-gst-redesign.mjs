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
  console.log("Starting GST logic redesign database migration...");

  try {
    // 1. Business accounts GST columns
    console.log("Adding GST columns to business_accounts...");
    await sql`
      ALTER TABLE business_accounts
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(20),
      ADD COLUMN IF NOT EXISTS gst_registration_type VARCHAR(30) NOT NULL DEFAULT 'REGULAR',
      ADD COLUMN IF NOT EXISTS pan VARCHAR(20);
    `;

    // 2. Customers GST columns
    console.log("Adding GST columns to customers...");
    await sql`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(20),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS address TEXT;
    `;

    // 3. Items GST columns
    console.log("Adding GST columns to items...");
    await sql`
      ALTER TABLE items
      ADD COLUMN IF NOT EXISTS tax_treatment VARCHAR(30) NOT NULL DEFAULT 'TAXABLE',
      ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) NOT NULL DEFAULT '0',
      ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) NOT NULL DEFAULT 'EXCLUSIVE',
      ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(20);
    `;

    // 4. Bills GST columns
    console.log("Adding GST columns to bills...");
    await sql`
      ALTER TABLE bills
      ADD COLUMN IF NOT EXISTS place_of_supply_state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS is_inter_state BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS total_cgst NUMERIC(12, 2) NOT NULL DEFAULT '0',
      ADD COLUMN IF NOT EXISTS total_sgst NUMERIC(12, 2) NOT NULL DEFAULT '0',
      ADD COLUMN IF NOT EXISTS total_igst NUMERIC(12, 2) NOT NULL DEFAULT '0',
      ADD COLUMN IF NOT EXISTS total_tax NUMERIC(12, 2) NOT NULL DEFAULT '0',
      ADD COLUMN IF NOT EXISTS round_off NUMERIC(12, 2) NOT NULL DEFAULT '0';
    `;

    // 5. Bill items GST snapshot columns
    console.log("Adding GST columns to bill_items...");
    await sql`
      ALTER TABLE bill_items
      ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS tax_treatment VARCHAR(30) DEFAULT 'TAXABLE',
      ADD COLUMN IF NOT EXISTS price_type VARCHAR(20) DEFAULT 'EXCLUSIVE',
      ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS cgst_rate NUMERIC(5, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS sgst_rate NUMERIC(5, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS igst_rate NUMERIC(5, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS total_tax NUMERIC(12, 2) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS line_total NUMERIC(12, 2) DEFAULT '0';
    `;

    console.log("Populating sensible defaults for existing records without altering history...");
    // For existing bill_items, backfill line_total = line_subtotal, taxable_amount = line_subtotal
    await sql`
      UPDATE bill_items
      SET 
        taxable_amount = line_subtotal,
        line_total = line_subtotal
      WHERE taxable_amount IS NULL OR taxable_amount = 0;
    `;

    // For existing bills, backfill total_tax = tax_amount
    await sql`
      UPDATE bills
      SET total_tax = tax_amount
      WHERE total_tax IS NULL OR (total_tax = 0 AND tax_amount > 0);
    `;

    console.log("GST Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
