import { neon, neonConfig } from '@neondatabase/serverless';

const rawUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const url = rawUrl.replace(/&channel_binding=require/g, "").replace(/\?channel_binding=require&?/g, "?");

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

console.log("Testing Neon DB connection...");

async function main() {
  try {
    const sql = neon(url);
    const result = await sql`SELECT NOW(), current_database(), current_user;`;
    console.log("Connected successfully to Neon Postgres!", result);
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
    console.log("Existing tables in public schema:", tables.map(t => t.table_name));
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}

main();
