import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
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
