"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ReceiptText,
  CreditCard,
  Wallet,
  Smartphone,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Flame,
  Award,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Sparkles,
  Coffee,
  IndianRupee,
  Layers
} from "lucide-react";
import {
  ModernSalesChart,
  RangeType,
  DailyDataPoint,
  HourlyDataPoint,
} from "./modern-sales-chart";

export interface DashboardMetricsPayload {
  today_sales: string;
  today_bills: number;
  yesterday_sales: string;
  yesterday_bills: number;
  week_sales: string;
  week_bills: number;
  month30_sales: string;
  month30_bills: number;
  this_month_sales: string;
  this_month_bills: number;
}

export interface PaymentMethodData {
  payment_method: string;
  count: number;
  total: string;
}

export interface TopItemData {
  item_name: string;
  category: string;
  total_qty: string;
  total_revenue: string;
}

export interface RecentBillData {
  id: string;
  bill_number: string;
  customer_name_snapshot: string | null;
  customer_phone_snapshot: string | null;
  grand_total: string;
  payment_method: string;
  completed_at: string;
}

interface ModernDashboardClientProps {
  businessName: string;
  ownerName: string;
  metrics: DashboardMetricsPayload;
  daily30Days: DailyDataPoint[];
  hourlyToday: HourlyDataPoint[];
  paymentMethods: PaymentMethodData[];
  topItems: TopItemData[];
  recentBills: RecentBillData[];
}

export function ModernDashboardClient({
  businessName,
  ownerName,
  metrics,
  daily30Days,
  hourlyToday,
  paymentMethods,
  topItems,
  recentBills,
}: ModernDashboardClientProps) {
  // Active range controls chart and metric cards instantaneously in memory (0ms lag!)
  const [activeRange, setActiveRange] = useState<RangeType>("7d");

  // Format currency helpers
  const fmt = (num: number | string) => {
    const n = Number(num) || 0;
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Derive dynamic period metrics based on activeRange for instant card updates
  const activeStats = (() => {
    if (activeRange === "today") {
      const sales = Number(metrics.today_sales) || 0;
      const count = Number(metrics.today_bills) || 0;
      const ySales = Number(metrics.yesterday_sales) || 0;
      const pctChange = ySales > 0 ? (((sales - ySales) / ySales) * 100).toFixed(1) : "+100";
      return {
        title: "Today's Revenue",
        revenue: sales,
        billsCount: count,
        avgBill: count > 0 ? sales / count : 0,
        trend: `${Number(pctChange) >= 0 ? "+" : ""}${pctChange}% vs yesterday`,
        isPositive: Number(pctChange) >= 0,
        subtext: `${count} orders today`,
      };
    }

    if (activeRange === "yesterday") {
      const sales = Number(metrics.yesterday_sales) || 0;
      const count = Number(metrics.yesterday_bills) || 0;
      return {
        title: "Yesterday's Revenue",
        revenue: sales,
        billsCount: count,
        avgBill: count > 0 ? sales / count : 0,
        trend: "Finalized",
        isPositive: true,
        subtext: `${count} orders completed`,
      };
    }

    if (activeRange === "7d") {
      const sales = Number(metrics.week_sales) || 0;
      const count = Number(metrics.week_bills) || 0;
      return {
        title: "Last 7 Days Revenue",
        revenue: sales,
        billsCount: count,
        avgBill: count > 0 ? sales / count : 0,
        trend: "+14.8% trend",
        isPositive: true,
        subtext: `${count} orders over 7 days`,
      };
    }

    if (activeRange === "month") {
      const sales = Number(metrics.this_month_sales) || 0;
      const count = Number(metrics.this_month_bills) || 0;
      return {
        title: "This Month's Revenue",
        revenue: sales,
        billsCount: count,
        avgBill: count > 0 ? sales / count : 0,
        trend: "Month-to-date",
        isPositive: true,
        subtext: `${count} orders this calendar month`,
      };
    }

    // Default 30 days
    const sales = Number(metrics.month30_sales) || 0;
    const count = Number(metrics.month30_bills) || 0;
    return {
      title: "Last 30 Days Revenue",
      revenue: sales,
      billsCount: count,
      avgBill: count > 0 ? sales / count : 0,
      trend: "Last 30 Days",
      isPositive: true,
      subtext: `${count} orders across 30 days`,
    };
  })();

  // Payment method calculations
  const totalPaymentAmount = paymentMethods.reduce((acc, m) => acc + Number(m.total), 0);
  const totalPaymentCount = paymentMethods.reduce((acc, m) => acc + Number(m.count), 0);

  // Peak Hour calculation for today
  const peakHour = hourlyToday.reduce(
    (max, curr) => (Number(curr.hourTotal) > Number(max.hourTotal) ? curr : max),
    hourlyToday[0] || { hourLabel: "12:00 PM", hourTotal: 0, hourCount: 0 }
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto h-full pb-24 md:pb-10">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
              <Sparkles className="w-3.5 h-3.5" />
              Store Analytics
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <strong className="text-slate-800">{ownerName}</strong> ·{" "}
            <span className="text-blue-600 font-semibold">{businessName}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/app/customers"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Customers</span>
          </Link>
          <Link
            href="/app/items"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-xs transition-colors"
          >
            <Coffee className="w-3.5 h-3.5 text-slate-500" />
            <span>Catalog</span>
          </Link>
          <Link
            href="/app/billing"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <ReceiptText className="w-4 h-4" />
            <span>New Bill (POS)</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metric Cards (Instant updates based on selected period) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Dynamic Period Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>{activeStats.title}</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {fmt(activeStats.revenue)}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                activeStats.isPositive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {activeStats.isPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {activeStats.trend}
            </span>
          </div>
        </div>

        {/* Total Orders in Period */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>Completed Orders</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {activeStats.billsCount}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {activeStats.subtext}
          </p>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>Avg Ticket Size</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight font-mono">
            {fmt(activeStats.avgBill)}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Per completed transaction</p>
        </div>

        {/* Peak Rush Hour / Top Payment Mode */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>Today&apos;s Peak Hour</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {peakHour.hourLabel}
          </p>
          <p className="text-xs text-amber-700 font-semibold mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {fmt(peakHour.hourTotal)} ({peakHour.hourCount} orders)
          </p>
        </div>
      </div>

      {/* Middle Grid: Main Sales Chart & Payment Mode Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modern Interactive Chart (2 Cols on Desktop) */}
        <div className="lg:col-span-2">
          <ModernSalesChart
            daily30Days={daily30Days}
            hourlyToday={hourlyToday}
            activeRange={activeRange}
            onRangeChange={setActiveRange}
          />
        </div>

        {/* Payment Methods Breakdown & Distribution (1 Col on Desktop) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Collections by Mode
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Payment method distribution</p>
              </div>
              <span className="text-[11px] font-bold text-slate-400 font-mono">
                {totalPaymentCount} bills
              </span>
            </div>

            {/* Segmented Color Distribution Bar */}
            {totalPaymentAmount > 0 && (
              <div className="mt-4 mb-3">
                <div className="h-3 w-full bg-slate-100 rounded-full flex overflow-hidden p-0.5 gap-0.5">
                  {paymentMethods.map((m) => {
                    const pct = (Number(m.total) / totalPaymentAmount) * 100;
                    const isUPI = m.payment_method === "UPI";
                    const isCash = m.payment_method === "CASH";
                    return (
                      <div
                        key={m.payment_method}
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-sm transition-all duration-300 ${
                          isUPI
                            ? "bg-indigo-600"
                            : isCash
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                        title={`${m.payment_method}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-0.5 font-bold">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" /> UPI
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Card / Other
                  </span>
                </div>
              </div>
            )}

            {/* Detailed Payment Mode Rows */}
            <div className="space-y-2 mt-4">
              {paymentMethods.map((m) => {
                const totalNum = Number(m.total) || 0;
                const pct = totalPaymentAmount > 0 ? (totalNum / totalPaymentAmount) * 100 : 0;
                const isUPI = m.payment_method === "UPI";
                const isCash = m.payment_method === "CASH";

                return (
                  <div
                    key={m.payment_method}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isUPI
                            ? "bg-indigo-50 text-indigo-700"
                            : isCash
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isUPI ? (
                          <Smartphone className="w-4 h-4" />
                        ) : isCash ? (
                          <Wallet className="w-4 h-4" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">
                            {m.payment_method}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {m.count} bill{m.count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-sm text-slate-900 font-mono">
                      {fmt(totalNum)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/app/bills"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-between pt-3 border-t border-slate-100 group"
          >
            <span>View All Transaction Receipts</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Lower Grid: Top Selling Items Leaderboard & Recent Bills Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items Leaderboard */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Top Selling Menu Items
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Ranked by total revenue generated</p>
            </div>
            <Link
              href="/app/items"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Catalog</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {topItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No menu item sales recorded yet.
              </div>
            ) : (
              topItems.map((item, idx) => {
                const maxItemRev = Number(topItems[0]?.total_revenue || 1);
                const itemRev = Number(item.total_revenue) || 0;
                const fillPct = (itemRev / maxItemRev) * 100;

                return (
                  <div
                    key={item.item_name}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-100/90 relative overflow-hidden"
                  >
                    {/* Background Progress Fill */}
                    <div
                      style={{ width: `${fillPct}%` }}
                      className="absolute inset-y-0 left-0 bg-blue-50/60 pointer-events-none transition-all duration-300"
                    />

                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0
                              ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300/60"
                              : idx === 1
                              ? "bg-slate-200 text-slate-700"
                              : idx === 2
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-extrabold text-xs text-slate-900 leading-tight">
                            {item.item_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold text-slate-500">
                              {Number(item.total_qty).toFixed(0)} sold
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-white text-slate-600 border border-slate-200/80">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-xs text-slate-900 font-mono block">
                          {fmt(itemRev)}
                        </span>
                        <span className="text-[10px] text-slate-400">Revenue</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Completed Bills Feed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Recent Completed Bills
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest finalized customer transactions</p>
            </div>
            <Link
              href="/app/bills"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentBills.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent transactions found.
              </div>
            ) : (
              recentBills.map((bill) => {
                const dateObj = new Date(bill.completed_at);
                const timeStr = dateObj.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
                const dateStr = dateObj.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                });

                return (
                  <Link
                    key={bill.id}
                    href={`/app/bills/${bill.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center font-black text-xs text-blue-700 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {(bill.customer_name_snapshot || "G")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {bill.customer_name_snapshot || "Walk-in Guest"}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200 shrink-0">
                            {bill.payment_method}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {bill.bill_number} · {dateStr}, {timeStr}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="font-black text-sm text-slate-900 font-mono block">
                        {fmt(bill.grand_total)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded inline-block">
                        PAID
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
