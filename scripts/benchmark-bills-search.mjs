import { neon } from "@neondatabase/serverless";
import fs from "fs";

if (!process.env.DATABASE_URL) {
  if (fs.existsSync(".env.local")) {
    const lines = fs.readFileSync(".env.local", "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        process.env[match[1]] = match[2]?.replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const customFetch = async (url, options) => {
  let attempts = 0;
  while (attempts < 5) {
    try {
      return await fetch(url, options);
    } catch (err) {
      attempts++;
      if (attempts >= 5) throw err;
      await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempts)));
    }
  }
};

const sql = neon(connectionString, { fetchOptions: { fetch: customFetch } });

async function benchmarkSearch() {
  console.log("=== Benchmarking Invoice Search Query Plans ===");

  // Find an account with bills
  const accounts = await sql`
    SELECT account_id, COUNT(*) as bill_count
    FROM bills
    GROUP BY account_id
    ORDER BY bill_count DESC
    LIMIT 1;
  `;

  if (accounts.length === 0) {
    console.log("No bills found in database.");
    return;
  }

  const accountId = accounts[0].account_id;
  const billCount = accounts[0].bill_count;
  console.log(`Testing with Account: ${accountId} (${billCount} bills)`);

  // Test 1: Empty search (standard recent list)
  console.log("\n--- Plan 1: Default view (No search query, recent bills) ---");
  const planDefault = await sql`
    EXPLAIN ANALYZE
    SELECT id, bill_number, grand_total, completed_at
    FROM bills
    WHERE account_id = ${accountId}
    ORDER BY completed_at DESC, id DESC
    LIMIT 15;
  `;
  planDefault.forEach((r) => console.log(r["QUERY PLAN"]));

  // Test 2: Substring search on bill number
  console.log("\n--- Plan 2: Substring Search on Bill Number ('%001%') ---");
  const planBillNum = await sql`
    EXPLAIN ANALYZE
    SELECT id, bill_number, customer_name_snapshot, grand_total, completed_at
    FROM bills
    WHERE account_id = ${accountId}
      AND bill_number ILIKE '%001%'
    ORDER BY completed_at DESC, id DESC
    LIMIT 15;
  `;
  planBillNum.forEach((r) => console.log(r["QUERY PLAN"]));

  // Test 3: Substring search on customer name
  console.log("\n--- Plan 3: Substring Search on Customer Name ('%Sharma%') ---");
  const planCustName = await sql`
    EXPLAIN ANALYZE
    SELECT id, bill_number, customer_name_snapshot, grand_total, completed_at
    FROM bills
    WHERE account_id = ${accountId}
      AND customer_name_snapshot ILIKE '%Sharma%'
    ORDER BY completed_at DESC, id DESC
    LIMIT 15;
  `;
  planCustName.forEach((r) => console.log(r["QUERY PLAN"]));

  console.log("\nSearch benchmark completed successfully.");
}

benchmarkSearch().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
