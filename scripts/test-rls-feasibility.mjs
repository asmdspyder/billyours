import { neon, neonConfig } from "@neondatabase/serverless";
import fs from "fs";

if (!process.env.DATABASE_URL) {
  if (fs.existsSync(".env")) {
    const lines = fs.readFileSync(".env", "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        process.env[match[1]] = match[2]?.replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

neonConfig.fetchEndpoint = (host) => `https://${host}/sql`;

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

const sql = neon(process.env.DATABASE_URL, { fetchOptions: { fetch: customFetch } });

async function testRlsFeasibility() {
  console.log("=== Testing PostgreSQL RLS Feasibility on Neon HTTP Driver ===");

  // 1. Create a temporary testing table to avoid modifying production tables
  await sql`
    CREATE TABLE IF NOT EXISTS _test_rls_demo (
      id SERIAL PRIMARY KEY,
      account_id VARCHAR(64) NOT NULL,
      data TEXT NOT NULL
    );
  `;

  // Insert test records for two distinct tenants
  await sql`DELETE FROM _test_rls_demo;`;
  await sql`
    INSERT INTO _test_rls_demo (account_id, data) VALUES
      ('tenant_alpha', 'Alpha Secret Data'),
      ('tenant_beta', 'Beta Secret Data');
  `;

  // Enable RLS and FORCE RLS (essential because connection user is neondb_owner)
  await sql`ALTER TABLE _test_rls_demo ENABLE ROW LEVEL SECURITY;`;
  await sql`ALTER TABLE _test_rls_demo FORCE ROW LEVEL SECURITY;`;

  // Drop old test policy if exists
  await sql`DROP POLICY IF EXISTS test_tenant_isolation_policy ON _test_rls_demo;`;

  // Create RLS policy using current_setting('app.current_tenant_id', true)
  await sql`
    CREATE POLICY test_tenant_isolation_policy ON _test_rls_demo
    FOR ALL
    USING (account_id = current_setting('app.current_tenant_id', true));
  `;

  console.log("RLS policy created with FORCE ROW LEVEL SECURITY.");

  // Test Case A: Query without setting tenant context
  console.log("\n--- Test A: Query without tenant context (Default stateless HTTP) ---");
  const unauthedRows = await sql`SELECT * FROM _test_rls_demo;`;
  console.log("Rows returned without context:", unauthedRows); // Should be empty []

  // Test Case B: Stateless session SET vs subsequent query
  console.log("\n--- Test B: SET in one HTTP query, SELECT in next HTTP query ---");
  await sql`SET app.current_tenant_id = 'tenant_alpha';`;
  const statelessRows = await sql`SELECT * FROM _test_rls_demo;`;
  console.log("Rows returned in separate HTTP query:", statelessRows); // Will be [] because HTTP is stateless!

  // Test Case C: Transaction batching with SET LOCAL
  console.log("\n--- Test C: Transaction batching with sql.transaction() and SET LOCAL ---");
  const txnResults = await sql.transaction([
    sql`SET LOCAL app.current_tenant_id = 'tenant_alpha';`,
    sql`SELECT * FROM _test_rls_demo;`
  ]);
  console.log("Rows returned inside transaction batch for tenant_alpha:", txnResults[1]);

  // Test Case D: Transaction batching for tenant_beta
  console.log("\n--- Test D: Transaction batching for tenant_beta ---");
  const txnBetaResults = await sql.transaction([
    sql`SET LOCAL app.current_tenant_id = 'tenant_beta';`,
    sql`SELECT * FROM _test_rls_demo;`
  ]);
  console.log("Rows returned inside transaction batch for tenant_beta:", txnBetaResults[1]);

  // Clean up
  await sql`DROP TABLE _test_rls_demo CASCADE;`;
  console.log("\nCleaned up test table.");
}

testRlsFeasibility().catch((err) => {
  console.error("RLS test error:", err);
  process.exit(1);
});
