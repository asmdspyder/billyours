import { neon } from "@neondatabase/serverless";
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

async function testTimezones() {
  console.log("=== Testing Timezone Boundary Computations ===");

  const timezones = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London"];

  for (const tz of timezones) {
    console.log(`\nTesting Timezone: ${tz}`);
    const res = await sql`
      SELECT
        timezone(${tz}, ((now() AT TIME ZONE ${tz})::date)::timestamp) as today_start_utc,
        timezone(${tz}, ((now() AT TIME ZONE ${tz})::date + INTERVAL '1 day')::timestamp) as today_end_utc,
        timezone(${tz}, date_trunc('month', now() AT TIME ZONE ${tz})) as month_start_utc,
        (now() AT TIME ZONE ${tz}) as local_current_time
    `;
    console.log("  Local current time :", res[0].local_current_time);
    console.log("  Today start (UTC)  :", res[0].today_start_utc);
    console.log("  Today end (UTC)    :", res[0].today_end_utc);
    console.log("  Month start (UTC)  :", res[0].month_start_utc);
  }
}

testTimezones().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
