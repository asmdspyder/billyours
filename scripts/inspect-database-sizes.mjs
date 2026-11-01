import { neon, neonConfig } from "@neondatabase/serverless";
import fs from "fs";

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) process.env[match[1]] = match[2]?.trim();
  }
}

neonConfig.fetchEndpoint = (h) => `https://${h}/sql`;
const sql = neon(process.env.DATABASE_URL);

async function inspectSizes() {
  console.log("=== Actual Database Table & Index Storage Analysis ===");

  const tables = await sql`
    SELECT
      t.relname AS table_name,
      pg_size_pretty(pg_total_relation_size(t.relid)) AS total_size,
      pg_size_pretty(pg_relation_size(t.relid)) AS table_size,
      pg_size_pretty(pg_total_relation_size(t.relid) - pg_relation_size(t.relid)) AS index_size,
      pg_total_relation_size(t.relid) AS total_bytes,
      s.n_live_tup AS row_count
    FROM pg_catalog.pg_statio_user_tables t
    JOIN pg_stat_user_tables s ON t.relid = s.relid
    ORDER BY pg_total_relation_size(t.relid) DESC;
  `;

  console.table(tables.map(t => ({
    Table: t.table_name,
    Rows: t.row_count,
    "Table Size": t.table_size,
    "Index Size": t.index_size,
    "Total Size": t.total_size,
  })));

  const totalDb = await sql`
    SELECT pg_size_pretty(pg_database_size(current_database())) as db_size,
           pg_database_size(current_database()) as db_bytes;
  `;
  console.log(`\nTotal Database Size: ${totalDb[0].db_size} (${totalDb[0].db_bytes} bytes)`);
}

inspectSizes().catch(console.error);
