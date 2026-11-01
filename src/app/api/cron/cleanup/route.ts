import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Scheduled Maintenance & Data Retention Cleanup Endpoint
 * 
 * Invocation:
 * GET or POST /api/cron/cleanup
 * Headers:
 * Authorization: Bearer <CRON_SECRET> or X-Cron-Secret: <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const xCronHeader = req.headers.get("x-cron-secret");

  const providedSecret =
    (authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null) ||
    xCronHeader?.trim();

  // Protect endpoint in production; in non-production, permit manual test invocation if CRON_SECRET is unset
  if (process.env.NODE_ENV === "production" || cronSecret) {
    if (!cronSecret || providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();

  try {
    // 1. Purge genuinely expired sessions in bounded batches (max 500 per invocation)
    const expiredSessions = await sql`
      DELETE FROM sessions
      WHERE id IN (
        SELECT id FROM sessions
        WHERE expires_at < NOW()
        LIMIT 500
      )
      RETURNING id;
    `;

    // 2. Purge expired or used password reset tokens in bounded batches (max 500 per invocation)
    const expiredResets = await sql`
      DELETE FROM password_resets
      WHERE id IN (
        SELECT id FROM password_resets
        WHERE expires_at < NOW()
           OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')
        LIMIT 500
      )
      RETURNING id;
    `;

    // 3. Purge revoked or long-expired shared bill links (> 30 days past expiry/revocation)
    // Preserves bills snapshots untouched!
    const expiredLinks = await sql`
      DELETE FROM shared_bill_links
      WHERE id IN (
        SELECT id FROM shared_bill_links
        WHERE (expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '30 days')
           OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')
        LIMIT 500
      )
      RETURNING id;
    `;

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      deletedSessions: expiredSessions.length,
      deletedPasswordResets: expiredResets.length,
      deletedShareLinks: expiredLinks.length,
      durationMs,
    });
  } catch (err: any) {
    console.error("[CRON_CLEANUP_ERROR]", err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to execute cleanup",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
