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
const url = rawUrl.replace(/&channel_binding=require/g, "").replace(/\?channel_binding=require&?/g, "?");
neonConfig.fetchEndpoint = (h) => `https://${h}/sql`;

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

const sql = neon(url);


async function inspect() {
  const constraints = await sql`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.constraint_schema = ccu.constraint_schema
    WHERE tc.table_name IN ('bills', 'bill_items', 'customers', 'staff_members', 'items')
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
  `;

  console.log("=== ACTIVE DATABASE CONSTRAINTS ===");
  for (const c of constraints) {
    console.log(`${c.table_name.padEnd(14)} | ${c.constraint_type.padEnd(12)} | ${c.constraint_name.padEnd(32)} | col: ${(c.column_name || '').padEnd(16)} -> ${(c.foreign_table_name || '').padEnd(16)} (${(c.foreign_column_name || '')}) [${c.delete_rule || 'NONE'}]`);
  }

  // Also check if any existing data violates composite relationships
  console.log("\n=== CROSS-TENANT INTEGRITY CHECKS ===");
  
  // 1. bills vs customers
  const orphanCustBills = await sql`
    SELECT b.id, b.account_id, b.customer_id, c.account_id as cust_account_id
    FROM bills b
    JOIN customers c ON b.customer_id = c.id
    WHERE b.account_id != c.account_id;
  `;
  console.log(`Cross-tenant bills -> customers violations: ${orphanCustBills.length}`);

  // 2. bills vs staff
  const orphanStaffBills = await sql`
    SELECT b.id, b.account_id, b.staff_id, s.account_id as staff_account_id
    FROM bills b
    JOIN staff_members s ON b.staff_id = s.id
    WHERE b.account_id != s.account_id;
  `;
  console.log(`Cross-tenant bills -> staff violations: ${orphanStaffBills.length}`);

  // 3. bill_items vs bills
  const orphanBillItems = await sql`
    SELECT bi.id, bi.account_id, bi.bill_id, b.account_id as bill_account_id
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE bi.account_id != b.account_id;
  `;
  console.log(`Cross-tenant bill_items -> bills violations: ${orphanBillItems.length}`);

  // 4. bill_items vs items
  const orphanItemItems = await sql`
    SELECT bi.id, bi.account_id, bi.item_id, i.account_id as item_account_id
    FROM bill_items bi
    JOIN items i ON bi.item_id = i.id
    WHERE bi.account_id != i.account_id;
  `;
  console.log(`Cross-tenant bill_items -> items violations: ${orphanItemItems.length}`);

  // 5. Duplicate active phones in customers
  const dups = await sql`
    SELECT account_id, normalized_phone, count(*)
    FROM customers
    WHERE archived_at IS NULL AND normalized_phone IS NOT NULL
    GROUP BY account_id, normalized_phone
    HAVING count(*) > 1;
  `;
  console.log(`Duplicate active customer phones: ${dups.length}`);
}

inspect().catch(console.error);

