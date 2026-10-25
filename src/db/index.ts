import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Clean connection string: strip channel_binding=require which is incompatible with HTTP serverless driver
// and causes DNS resolution errors (api.c-3.ap-southeast-1.aws.neon.tech)
const rawConnectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const connectionString = rawConnectionString.replace(/&channel_binding=require/g, "").replace(/\?channel_binding=require&?/g, "?");

// Configure resilient fetch with automatic retry & exponential backoff for Neon serverless cold starts & transient network errors
const originalFetch = globalThis.fetch;
neonConfig.fetchFunction = async (url: any, options: any) => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await originalFetch(url, options);
      // Neon can return 503 or 504 during compute cold-start wakeups
      if ((response.status === 503 || response.status === 504) && attempts < maxAttempts - 1) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempts)));
        continue;
      }
      return response;
    } catch (err: any) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw err;
      }
      // Wait with exponential backoff: 300ms, 600ms, 1200ms
      await new Promise((resolve) => setTimeout(resolve, 300 * Math.pow(2, attempts)));
    }
  }

  return originalFetch(url, options);
};

// Neon HTTP client for edge and serverless compatibility
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export { sql, schema };
