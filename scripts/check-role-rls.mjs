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
const sql = neon(process.env.DATABASE_URL);

async function checkRole() {
  const res = await sql`
    SELECT rolname, rolsuper, rolbypassrls
    FROM pg_roles
    WHERE rolname = current_user;
  `;
  console.log("Current DB User Role Attributes:", res);
}

checkRole();
