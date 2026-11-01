import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { neon, neonConfig } from "@neondatabase/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) process.env[match[1]] = match[2]?.trim();
  }
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is required to execute migrations.");
}

const url = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

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

async function runAllMigrations() {
  console.log("=== BILLyOURS DATABASE MIGRATION RUNNER ===");
  console.log(`Database Target: ${url.replace(/\/\/[^@]+@/, "//***:***@")}`);

  // 1. Acquire advisory lock to prevent concurrent migrations during multi-instance deployments
  console.log("[LOCK] Acquiring advisory lock 'billyours_schema_migrations'...");
  const lockRes = await sql`SELECT pg_try_advisory_lock(hashtext('billyours_schema_migrations')) as acquired;`;
  const acquired = lockRes[0]?.acquired;

  if (!acquired) {
    throw new Error("[MIGRATION_LOCK_BLOCKED] Could not acquire migration advisory lock. Another migration runner is currently executing.");
  }
  console.log("[LOCK] Advisory lock acquired successfully.");

  try {
    // 2. Ensure tracking table exists
    await sql`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f.match(/^\d+.*\.mjs$/))
      .sort();

    console.log(`Discovered ${files.length} versioned migration file(s):`, files);

    for (const file of files) {
      const fullPath = path.join(__dirname, file);
      console.log(`\n----------------------------------------`);
      console.log(`Executing migration script: ${file}`);
      const mod = await import(`file://${fullPath}`);
      if (typeof mod.runMigration === "function") {
        const result = await mod.runMigration();
        console.log(`Result for ${file}:`, result);
      } else {
        console.warn(`Migration ${file} does not export runMigration()`);
      }
    }

    console.log("\n=== ALL MIGRATIONS VERIFIED AND COMPLETED SUCCESSFULLY ===");
  } finally {
    // 3. Always release advisory lock
    console.log("[LOCK] Releasing advisory lock...");
    await sql`SELECT pg_advisory_unlock(hashtext('billyours_schema_migrations'));`;
    console.log("[LOCK] Advisory lock released.");
  }
}

runAllMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration runner failed:", err);
    process.exit(1);
  });
