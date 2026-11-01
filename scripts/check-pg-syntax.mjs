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
const sql = neon(url);

async function check() {
  const v = await sql`SELECT version();`;
  console.log("PostgreSQL Version:", v[0].version);

  await sql`DROP TABLE IF EXISTS _test_child;`;
  await sql`DROP TABLE IF EXISTS _test_parent;`;

  await sql`
    CREATE TABLE _test_parent (
      acc_id VARCHAR(64),
      item_id VARCHAR(64),
      PRIMARY KEY (acc_id, item_id)
    );
  `;

  await sql`
    CREATE TABLE _test_child (
      id VARCHAR(64) PRIMARY KEY,
      acc_id VARCHAR(64) NOT NULL,
      item_id VARCHAR(64),
      CONSTRAINT fk_test_child_parent FOREIGN KEY (acc_id, item_id)
        REFERENCES _test_parent(acc_id, item_id) ON DELETE SET NULL (item_id)
    );
  `;
  console.log("SUCCESS: PostgreSQL 18 natively supports ON DELETE SET NULL (column_list)!");

  // Test inserting and deleting parent
  await sql`INSERT INTO _test_parent (acc_id, item_id) VALUES ('acc_1', 'itm_1');`;
  await sql`INSERT INTO _test_child (id, acc_id, item_id) VALUES ('ch_1', 'acc_1', 'itm_1');`;
  
  // Delete parent
  await sql`DELETE FROM _test_parent WHERE acc_id = 'acc_1' AND item_id = 'itm_1';`;

  // Verify child
  const child = await sql`SELECT id, acc_id, item_id FROM _test_child WHERE id = 'ch_1';`;
  console.log("Child after parent delete:", child[0]);
  if (child[0].acc_id === 'acc_1' && child[0].item_id === null) {
    console.log("VERIFIED: acc_id remained 'acc_1' (NOT NULL) and item_id became NULL!");
  } else {
    console.error("UNEXPECTED child state:", child[0]);
  }

  await sql`DROP TABLE _test_child;`;
  await sql`DROP TABLE _test_parent;`;
}

check().catch(console.error);
