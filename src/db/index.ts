import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// 1. Validate environment configuration
const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[DB_INIT_FATAL] DATABASE_URL environment variable is required in production.");
  }
}

// Fallback only permitted in non-production local development
const connectionString = (
  rawConnectionString ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

// 2. Configure Neon HTTP endpoint resolution
// Strips proxy rewriting for AWS cell clusters (e.g., .c-3.ap-southeast-1) to avoid ENOTFOUND api.c-3... DNS errors
neonConfig.fetchEndpoint = (host: string) => `https://${host}/sql`;

// 3. Configure resilient fetch with exponential backoff, jitter, and strict error classification
const originalFetch = globalThis.fetch;

function sanitizeUrlForLogs(urlStr: string): string {
  try {
    return urlStr.replace(/\/\/[^@]+@/, "//***:***@");
  } catch {
    return "[redacted-url]";
  }
}

function isPreExecutionConnectionError(err: any): boolean {
  const code = err?.cause?.code || err?.code || "";
  // DNS lookup failure, connection refused, host unreachable, or TLS handshake setup failures
  return (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "EHOSTUNREACH" ||
    code === "EAI_AGAIN"
  );
}

function isSafeIdempotentQuery(body: any): boolean {
  try {
    if (!body) return true;
    const parsed = typeof body === "string" ? JSON.parse(body) : body;
    const query = (parsed.query || parsed.queries?.[0]?.query || "").trim().toUpperCase();
    return query.startsWith("SELECT") || query.startsWith("EXPLAIN") || query.startsWith("SHOW");
  } catch {
    return false;
  }
}

neonConfig.fetchFunction = async (url: any, options: any) => {
  let attempts = 0;
  const maxAttempts = 3;
  const isRead = isSafeIdempotentQuery(options?.body);

  while (attempts < maxAttempts) {
    try {
      const response = await originalFetch(url, options);

      // Neon serverless compute cold-start wakeups produce transient 503 or 504 status
      // (This indicates proxy wake-up before SQL execution; safe to retry for all queries)
      if ((response.status === 503 || response.status === 504) && attempts < maxAttempts - 1) {
        attempts++;
        // Exponential backoff with jitter: 200ms -> 400ms -> 800ms (+ random jitter 0-50ms)
        const jitter = Math.floor(Math.random() * 50);
        const delay = 200 * Math.pow(2, attempts) + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Never retry 4xx errors (client errors, validation failures, syntax errors)
      return response;
    } catch (err: any) {
      attempts++;

      // Distinguish pre-execution connection errors vs mid-flight uncertain execution outcomes
      const isPreExecution = isPreExecutionConnectionError(err);

      // If it's a non-idempotent mutation and the failure is NOT a confirmed pre-execution error,
      // do not blindly retry to avoid duplicate write risks.
      if (!isRead && !isPreExecution) {
        const sanitized = sanitizeUrlForLogs(String(url));
        console.error(`[DB_MUTATION_UNCERTAIN] Non-idempotent write failed with uncertain outcome to ${sanitized}: ${err?.message || err}. Not retrying to prevent duplicate mutation.`);
        throw err;
      }

      if (attempts >= maxAttempts) {
        const sanitized = sanitizeUrlForLogs(String(url));
        console.error(`[DB_FETCH_ERROR] Connection failure after ${maxAttempts} attempts to ${sanitized}: ${err?.message || "Unknown error"}`);
        throw err;
      }

      const jitter = Math.floor(Math.random() * 50);
      const delay = 200 * Math.pow(2, attempts) + jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return originalFetch(url, options);
};

// 4. Neon HTTP serverless client for stateless, low-latency queries & batched transactions
const sql = neon(connectionString);

// 5. Drizzle client export for type-safe schema definitions and future migrations
export const db = drizzle(sql, { schema });
export { sql, schema };
