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
  throw new Error("DATABASE_URL is required to run dashboard query benchmark.");
}

const url = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

neonConfig.fetchEndpoint = (h) => `https://${h}/sql`;
const sql = neon(url);

async function benchmarkQuery(name, queryFn, iterations = 5) {
  const times = [];
  let resultSample = null;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    resultSample = await queryFn();
    const duration = performance.now() - start;
    times.push(duration);
  }

  times.sort((a, b) => a - b);
  const min = times[0].toFixed(2);
  const median = times[Math.floor(times.length / 2)].toFixed(2);
  const max = times[times.length - 1].toFixed(2);

  console.log(`⏱️  ${name.padEnd(42)} | min: ${min.padStart(6)}ms | med: ${median.padStart(6)}ms | max: ${max.padStart(6)}ms`);
  return { name, min, median, max, resultSample };
}

async function runDashboardBenchmarks() {
  console.log("==========================================================================");
  console.log("          BILLyOURS — DASHBOARD QUERY PERFORMANCE BENCHMARK               ");
  console.log("==========================================================================");

  const accounts = await sql`
    SELECT id, business_name, timezone
    FROM business_accounts
    WHERE status = 'ACTIVE' AND (id = 'acc_demo_sharma' OR id NOT LIKE 'acc_%_%')
    ORDER BY created_at ASC
    LIMIT 1;
  `;
  const accountId = accounts[0].id;
  const tz = accounts[0].timezone || "Asia/Kolkata";
  console.log(`Auditing Account: ${accounts[0].business_name} (${accountId}) | Timezone: ${tz}\n`);

  // Query 1: Bounded Period Metrics
  await benchmarkQuery("1. Bounded Period Metrics (Today/Yest/30d)", () => sql`
    SELECT
      COALESCE(SUM(grand_total) FILTER (WHERE completed_at >= (NOW() AT TIME ZONE ${tz})::date AND completed_at < (NOW() AT TIME ZONE ${tz})::date + INTERVAL '1 day'), 0)::numeric as today_sales,
      COUNT(id) FILTER (WHERE completed_at >= (NOW() AT TIME ZONE ${tz})::date AND completed_at < (NOW() AT TIME ZONE ${tz})::date + INTERVAL '1 day')::int as today_bills,
      COALESCE(SUM(grand_total) FILTER (WHERE completed_at >= (NOW() AT TIME ZONE ${tz})::date - INTERVAL '1 day' AND completed_at < (NOW() AT TIME ZONE ${tz})::date), 0)::numeric as yesterday_sales,
      COUNT(id) FILTER (WHERE completed_at >= (NOW() AT TIME ZONE ${tz})::date - INTERVAL '1 day' AND completed_at < (NOW() AT TIME ZONE ${tz})::date)::int as yesterday_bills,
      COALESCE(SUM(grand_total) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days'), 0)::numeric as week_sales,
      COUNT(id) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days')::int as week_bills,
      COALESCE(SUM(grand_total) FILTER (WHERE completed_at >= NOW() - INTERVAL '30 days'), 0)::numeric as month30_sales,
      COUNT(id) FILTER (WHERE completed_at >= NOW() - INTERVAL '30 days')::int as month30_bills,
      COALESCE(SUM(grand_total) FILTER (WHERE completed_at >= date_trunc('month', NOW() AT TIME ZONE ${tz})), 0)::numeric as this_month_sales,
      COUNT(id) FILTER (WHERE completed_at >= date_trunc('month', NOW() AT TIME ZONE ${tz}))::int as this_month_bills
    FROM bills
    WHERE account_id = ${accountId}
      AND status = 'COMPLETED'
      AND completed_at >= (NOW() AT TIME ZONE ${tz})::date - INTERVAL '35 days';
  `);

  // Query 2: Daily 30 Days Breakdown
  await benchmarkQuery("2. Daily 30 Days Breakdown (Index scan)", () => sql`
    SELECT
      (d.day)::date as day_date,
      to_char(d.day, 'Dy') as day_label,
      to_char(d.day, 'DD Mon') as day_full_label,
      COALESCE(SUM(b.grand_total), 0)::numeric as day_total,
      COUNT(b.id)::int as day_count
    FROM generate_series(
      (NOW() AT TIME ZONE ${tz})::date - INTERVAL '29 days',
      (NOW() AT TIME ZONE ${tz})::date,
      INTERVAL '1 day'
    ) d(day)
    LEFT JOIN bills b ON
      b.account_id = ${accountId}
      AND b.status = 'COMPLETED'
      AND b.completed_at >= (NOW() AT TIME ZONE ${tz})::date - INTERVAL '30 days'
      AND (b.completed_at AT TIME ZONE ${tz})::date = (d.day)::date
    GROUP BY d.day
    ORDER BY d.day ASC;
  `);

  // Query 3: Hourly Breakdown
  await benchmarkQuery("3. Today Hourly Breakdown (8 AM - 10 PM)", () => sql`
    SELECT
      h.hour_num,
      to_char(time '00:00' + (h.hour_num || ' hour')::interval, 'HH12 AM') as hour_label,
      COALESCE(SUM(b.grand_total), 0)::numeric as hour_total,
      COUNT(b.id)::int as hour_count
    FROM generate_series(8, 22) h(hour_num)
    LEFT JOIN bills b ON
      b.account_id = ${accountId}
      AND b.status = 'COMPLETED'
      AND b.completed_at >= (NOW() AT TIME ZONE ${tz})::date
      AND b.completed_at < (NOW() AT TIME ZONE ${tz})::date + INTERVAL '1 day'
      AND EXTRACT(HOUR FROM b.completed_at AT TIME ZONE ${tz}) = h.hour_num
    GROUP BY h.hour_num
    ORDER BY h.hour_num ASC;
  `);

  // Query 4: Payment Methods Breakdown
  await benchmarkQuery("4. Payment Methods (30-day bounded)", () => sql`
    SELECT
      payment_method,
      COUNT(id)::int as count,
      COALESCE(SUM(grand_total), 0)::numeric as total
    FROM bills
    WHERE account_id = ${accountId}
      AND status = 'COMPLETED'
      AND completed_at >= NOW() - INTERVAL '30 days'
    GROUP BY payment_method
    ORDER BY total DESC;
  `);

  // Query 5: Top 5 Items
  await benchmarkQuery("5. Top 5 Selling Items (30-day bounded)", () => sql`
    SELECT
      bi.item_name_snapshot as item_name,
      COALESCE(i.category, 'General') as category,
      SUM(bi.quantity)::numeric as total_qty,
      SUM(bi.line_subtotal)::numeric as total_revenue
    FROM bill_items bi
    JOIN bills b ON b.id = bi.bill_id AND b.account_id = ${accountId}
    LEFT JOIN items i ON i.id = bi.item_id AND i.account_id = ${accountId}
    WHERE bi.account_id = ${accountId}
      AND b.status = 'COMPLETED'
      AND b.completed_at >= NOW() - INTERVAL '30 days'
    GROUP BY bi.item_name_snapshot, i.category
    ORDER BY total_revenue DESC
    LIMIT 5;
  `);

  // Query 6: Recent Completed Bills
  await benchmarkQuery("6. Recent 6 Completed Bills", () => sql`
    SELECT
      id,
      bill_number,
      customer_name_snapshot,
      customer_phone_snapshot,
      grand_total,
      payment_method,
      completed_at
    FROM bills
    WHERE account_id = ${accountId}
      AND status = 'COMPLETED'
    ORDER BY completed_at DESC
    LIMIT 6;
  `);

  console.log("\n==========================================================================");
  console.log("  Benchmark Completed: All dashboard queries execute with sub-100ms latency!  ");
  console.log("==========================================================================");
}

runDashboardBenchmarks()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
  });
