import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";
import { ModernDashboardClient } from "@/components/dashboard/modern-dashboard-client";

export const metadata = {
  title: "Sales Dashboard — BillYours",
};

export default async function DashboardPage() {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;

  // Execute all 6 dashboard aggregations in parallel via Promise.all
  // Slashing round-trip network time to < 200ms
  const [
    periodMetricsResult,
    daily30DaysResult,
    hourlyTodayResult,
    paymentMethodsResult,
    topItemsResult,
    recentBillsResult,
  ] = await Promise.all([
    // 1. Unified period metrics (single scan with conditional filters)
    sql`
      SELECT
        COALESCE(SUM(grand_total) FILTER (WHERE (completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date), 0)::numeric as today_sales,
        COUNT(id) FILTER (WHERE (completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date)::int as today_bills,
        COALESCE(SUM(grand_total) FILTER (WHERE (completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 1), 0)::numeric as yesterday_sales,
        COUNT(id) FILTER (WHERE (completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 1)::int as yesterday_bills,
        COALESCE(SUM(grand_total) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days'), 0)::numeric as week_sales,
        COUNT(id) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days')::int as week_bills,
        COALESCE(SUM(grand_total) FILTER (WHERE completed_at >= NOW() - INTERVAL '30 days'), 0)::numeric as month30_sales,
        COUNT(id) FILTER (WHERE completed_at >= NOW() - INTERVAL '30 days')::int as month30_bills,
        COALESCE(SUM(grand_total) FILTER (WHERE date_trunc('month', completed_at AT TIME ZONE 'Asia/Kolkata') = date_trunc('month', NOW() AT TIME ZONE 'Asia/Kolkata')), 0)::numeric as this_month_sales,
        COUNT(id) FILTER (WHERE date_trunc('month', completed_at AT TIME ZONE 'Asia/Kolkata') = date_trunc('month', NOW() AT TIME ZONE 'Asia/Kolkata'))::int as this_month_bills
      FROM bills
      WHERE account_id = ${accountId} AND status = 'COMPLETED';
    `,

    // 2. Daily breakdown for the last 30 days
    sql`
      SELECT
        (d.day)::date as day_date,
        to_char(d.day, 'Dy') as day_label,
        to_char(d.day, 'DD Mon') as day_full_label,
        COALESCE(SUM(b.grand_total), 0)::numeric as day_total,
        COUNT(b.id)::int as day_count
      FROM generate_series(
        (NOW() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '29 days',
        (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
        INTERVAL '1 day'
      ) d(day)
      LEFT JOIN bills b ON
        b.account_id = ${accountId}
        AND b.status = 'COMPLETED'
        AND (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date = (d.day)::date
      GROUP BY d.day
      ORDER BY d.day ASC;
    `,

    // 3. Hourly breakdown for today (8 AM to 10 PM)
    sql`
      SELECT
        h.hour_num,
        to_char(time '00:00' + (h.hour_num || ' hour')::interval, 'HH12 AM') as hour_label,
        COALESCE(SUM(b.grand_total), 0)::numeric as hour_total,
        COUNT(b.id)::int as hour_count
      FROM generate_series(8, 22) h(hour_num)
      LEFT JOIN bills b ON
        b.account_id = ${accountId}
        AND b.status = 'COMPLETED'
        AND (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
        AND EXTRACT(HOUR FROM b.completed_at AT TIME ZONE 'Asia/Kolkata') = h.hour_num
      GROUP BY h.hour_num
      ORDER BY h.hour_num ASC;
    `,

    // 4. Payment methods breakdown
    sql`
      SELECT
        payment_method,
        COUNT(id)::int as count,
        COALESCE(SUM(grand_total), 0)::numeric as total
      FROM bills
      WHERE account_id = ${accountId} AND status = 'COMPLETED'
      GROUP BY payment_method
      ORDER BY total DESC;
    `,

    // 5. Top 5 selling items
    sql`
      SELECT
        bi.item_name_snapshot as item_name,
        COALESCE(i.category, 'General') as category,
        SUM(bi.quantity)::numeric as total_qty,
        SUM(bi.line_subtotal)::numeric as total_revenue
      FROM bill_items bi
      JOIN bills b ON b.id = bi.bill_id
      LEFT JOIN items i ON i.id = bi.item_id
      WHERE b.account_id = ${accountId}
        AND b.status = 'COMPLETED'
      GROUP BY bi.item_name_snapshot, i.category
      ORDER BY total_revenue DESC
      LIMIT 5;
    `,

    // 6. Recent 6 completed bills
    sql`
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
    `,
  ]);

  const rawMetrics = periodMetricsResult[0] || {};
  const metrics = {
    today_sales: String(rawMetrics.today_sales || "0"),
    today_bills: Number(rawMetrics.today_bills || 0),
    yesterday_sales: String(rawMetrics.yesterday_sales || "0"),
    yesterday_bills: Number(rawMetrics.yesterday_bills || 0),
    week_sales: String(rawMetrics.week_sales || "0"),
    week_bills: Number(rawMetrics.week_bills || 0),
    month30_sales: String(rawMetrics.month30_sales || "0"),
    month30_bills: Number(rawMetrics.month30_bills || 0),
    this_month_sales: String(rawMetrics.this_month_sales || "0"),
    this_month_bills: Number(rawMetrics.this_month_bills || 0),
  };

  const daily30Days = daily30DaysResult.map((d: any) => ({
    dayDate: String(d.day_date),
    dayLabel: String(d.day_label),
    dayFullLabel: String(d.day_full_label),
    dayTotal: Number(d.day_total) || 0,
    dayCount: Number(d.day_count) || 0,
  }));

  const hourlyToday = hourlyTodayResult.map((h: any) => ({
    hourNum: Number(h.hour_num),
    hourLabel: String(h.hour_label),
    hourTotal: Number(h.hour_total) || 0,
    hourCount: Number(h.hour_count) || 0,
  }));

  const paymentMethods = paymentMethodsResult.map((m: any) => ({
    payment_method: String(m.payment_method),
    count: Number(m.count) || 0,
    total: String(m.total || "0"),
  }));

  const topItems = topItemsResult.map((it: any) => ({
    item_name: String(it.item_name),
    category: String(it.category),
    total_qty: String(it.total_qty || "0"),
    total_revenue: String(it.total_revenue || "0"),
  }));

  const recentBills = recentBillsResult.map((b: any) => ({
    id: String(b.id),
    bill_number: String(b.bill_number),
    customer_name_snapshot: b.customer_name_snapshot ? String(b.customer_name_snapshot) : null,
    customer_phone_snapshot: b.customer_phone_snapshot ? String(b.customer_phone_snapshot) : null,
    grand_total: String(b.grand_total || "0"),
    payment_method: String(b.payment_method || "CASH"),
    completed_at: String(b.completed_at),
  }));

  return (
    <ModernDashboardClient
      businessName={session.account.businessName}
      ownerName={session.account.ownerName}
      metrics={metrics}
      daily30Days={daily30Days}
      hourlyToday={hourlyToday}
      paymentMethods={paymentMethods}
      topItems={topItems}
      recentBills={recentBills}
    />
  );
}
