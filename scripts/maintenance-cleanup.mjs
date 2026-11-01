import { neon, neonConfig } from "@neondatabase/serverless";
import fs from "fs";

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2]?.trim();
    }
  }
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is required for maintenance cleanup.");
}

const url = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

neonConfig.fetchEndpoint = (h) => `https://${h}/sql`;
const sql = neon(url);

export async function runMaintenanceCleanup() {
  console.log("=== BILLyOURS MAINTENANCE & DATA RETENTION CLEANUP ===");
  const startTime = Date.now();

  // 1. Purge genuinely expired sessions
  const expiredSessions = await sql`
    DELETE FROM sessions
    WHERE expires_at < NOW()
    RETURNING id;
  `;
  console.log(`[CLEANUP] Deleted ${expiredSessions.length} expired session(s).`);

  // 2. Purge expired or used password reset tokens
  const expiredResets = await sql`
    DELETE FROM password_resets
    WHERE expires_at < NOW() OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')
    RETURNING id;
  `;
  console.log(`[CLEANUP] Deleted ${expiredResets.length} expired/used password reset token(s).`);

  // 3. Purge revoked or long-expired shared bill links (> 90 days past expiry)
  const expiredLinks = await sql`
    DELETE FROM shared_bill_links
    WHERE (expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '30 days')
       OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')
    RETURNING id;
  `;
  console.log(`[CLEANUP] Deleted ${expiredLinks.length} expired/revoked share link(s).`);

  const durationMs = Date.now() - startTime;
  console.log(`=== CLEANUP FINISHED IN ${durationMs}ms ===`);

  return {
    deletedSessions: expiredSessions.length,
    deletedResets: expiredResets.length,
    deletedLinks: expiredLinks.length,
    durationMs,
  };
}

if (process.argv[1]?.endsWith("maintenance-cleanup.mjs")) {
  runMaintenanceCleanup()
    .then((r) => {
      console.log("Cleanup summary:", r);
    })
    .catch((err) => {
      console.error("Cleanup error:", err);
      process.exitCode = 1;
    });
}
