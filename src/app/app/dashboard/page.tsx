import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";
import Link from "next/link";
import {
  TrendingUp,
  ReceiptText,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShoppingBag,
  IndianRupee,
  Users,
} from "lucide-react";
import { SalesTrendChart } from "@/components/dashboard/sales-trend-chart";

export const metadata = {
  title: "Sales Dashboard — BillYours",
};

export default async function DashboardPage() {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;

  // Aggregate metrics using PostgreSQL aggregation in tenant scope
  // 1. Today's completed metrics (Asia/Kolkata timezone)
  const todayMetrics = await sql`
    SELECT
      COUNT(id)::int as today_bills_count,
      COALESCE(SUM(grand_total), 0)::numeric as today_sales
    FROM bills
    WHERE account_id = ${accountId}
      AND status = 'COMPLETED'
      AND (completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
  `;

  // 2. Today's payment mode breakdown
  const todayMethods = await sql`
    SELECT
      payment_method,
      COUNT(id)::int as count,
      COALESCE(SUM(grand_total), 0)::numeric as total
    FROM bills
    WHERE account_id = ${accountId}
      AND status = 'COMPLETED'
      AND (completed_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    GROUP BY payment_method
    ORDER BY total DESC;
  `;

  // 3. Last 7 days sales
  const weekMetrics = await sql`
    SELECT
      COALESCE(SUM(grand_total), 0)::numeric as week_sales,
      COUNT(id)::int as week_bills_count
    FROM bills
    WHERE account_id = ${accountId}
      AND status = 'COMPLETED'
      AND completed_at >= NOW() - INTERVAL '7 days';
  `;

  // 4. This month sales
  const monthMetrics = await sql`
    SELECT
      COALESCE(SUM(grand_total), 0)::numeric as month_sales,
      COUNT(id)::int as month_bills_count
    FROM bills
    WHERE account_id = ${accountId}
      AND status = 'COMPLETED'
      AND date_trunc('month', completed_at AT TIME ZONE 'Asia/Kolkata') = date_trunc('month', NOW() AT TIME ZONE 'Asia/Kolkata');
  `;

  // 5. Daily sales breakdown for last 7 days
  const dailyBreakdown = await sql`
    SELECT
      (d.day)::date as day_date,
      to_char(d.day, 'Dy') as day_label,
      COALESCE(SUM(b.grand_total), 0)::numeric as day_total
    FROM generate_series(
      (NOW() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '6 days',
      (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
      INTERVAL '1 day'
    ) d(day)
    LEFT JOIN bills b ON
      b.account_id = ${accountId}
      AND b.status = 'COMPLETED'
      AND (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date = (d.day)::date
    GROUP BY d.day
    ORDER BY d.day ASC;
  `;

  // 6. Recent 5 completed bills
  const recentBills = await sql`
    SELECT
      id,
      bill_number,
      customer_name_snapshot,
      grand_total,
      payment_method,
      completed_at
    FROM bills
    WHERE account_id = ${accountId}
      AND status = 'COMPLETED'
    ORDER BY completed_at DESC
    LIMIT 5;
  `;

  const todaySalesNum = Number(todayMetrics[0]?.today_sales || 0);
  const todayCount = Number(todayMetrics[0]?.today_bills_count || 0);
  const avgBillToday = todayCount > 0 ? (todaySalesNum / todayCount).toFixed(2) : "0.00";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full pb-20 md:pb-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {session.account.businessName}
          </p>
        </div>
        <Link
          href="/app/billing"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <ReceiptText className="w-4 h-4" />
          <span>New Bill</span>
        </Link>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Today&apos;s Sales</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900">
            ₹{todaySalesNum.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {todayCount} bill{todayCount === 1 ? "" : "s"} today
          </p>
        </div>

        {/* Average Bill Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Avg Bill</span>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900">
            ₹{avgBillToday}
          </p>
          <p className="text-xs text-slate-400 mt-1">Per transaction today</p>
        </div>

        {/* Last 7 Days Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Last 7 Days</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900">
            ₹{Number(weekMetrics[0]?.week_sales || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {Number(weekMetrics[0]?.week_bills_count || 0)} bills
          </p>
        </div>

        {/* This Month Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>This Month</span>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xl md:text-2xl font-black text-slate-900">
            ₹{Number(monthMetrics[0]?.month_sales || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {Number(monthMetrics[0]?.month_bills_count || 0)} bills
          </p>
        </div>
      </div>

      {/* Middle Grid: Lightweight Chart & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Trend Chart (2 Cols) */}
        <div className="lg:col-span-2">
          <SalesTrendChart
            data={dailyBreakdown.map((d: any) => ({
              dayDate: String(d.day_date),
              dayLabel: String(d.day_label),
              dayTotal: Number(d.day_total) || 0,
            }))}
          />
        </div>

        {/* Today's Collections by Mode (1 Col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-sm text-slate-900">Today&apos;s Collections by Mode</h2>
            <p className="text-xs text-slate-500 mt-0.5">Collections grouped by payment mode</p>
          </div>

          <div className="space-y-2.5 my-auto">
            {todayMethods.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No collections yet today.
              </div>
            ) : (
              todayMethods.map((m: any) => (
                <div
                  key={m.payment_method}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{m.payment_method}</span>
                    <span className="text-[11px] text-slate-400">
                      ({m.count} bill{m.count === 1 ? "" : "s"})
                    </span>
                  </div>
                  <span className="font-black text-sm text-blue-700">
                    ₹{Number(m.total).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>

          <Link
            href="/app/bills"
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center justify-between pt-2 border-t border-slate-100"
          >
            <span>View All Bills</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">Recent Completed Bills</h2>
          <Link
            href="/app/bills"
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>View All Bills</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentBills.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No completed bills yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Bill Number</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5 text-center">Payment Mode</th>
                  <th className="px-4 py-2.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBills.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/app/bills/${b.id}`}
                        className="font-mono font-bold text-blue-600 hover:underline text-xs"
                      >
                        {b.bill_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 text-xs font-medium">
                      {b.customer_name_snapshot || "Walk-in Customer"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900 text-xs">
                      ₹{Number(b.grand_total).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {b.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-400 text-xs whitespace-nowrap">
                      {new Date(b.completed_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
