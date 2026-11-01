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

async function testTrgm() {
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
  console.log("SUCCESS: pg_trgm extension created successfully!");
  const res = await sql`SELECT similarity('Sharma Sweets', 'sharma');`;
  console.log("pg_trgm test similarity:", res[0]);
}

testTrgm().catch(console.error);
