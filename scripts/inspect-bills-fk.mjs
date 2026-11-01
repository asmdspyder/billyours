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

async function inspectBillsFk() {
  const fks = await sql`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'bills' AND tc.constraint_type = 'FOREIGN KEY';
  `;

  console.log("Foreign keys on bills:", fks);
}

inspectBillsFk().catch((e) => console.error(e));
