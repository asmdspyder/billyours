"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Calendar,
  Sparkles,
  Award,
  Zap,
  Clock,
  ArrowUpRight,
  Info
} from "lucide-react";

export type RangeType = "today" | "yesterday" | "7d" | "30d" | "month";
export type MetricType = "revenue" | "orders" | "avg";
export type ChartStyle = "area" | "bar";

export interface DailyDataPoint {
  dayDate: string;
  dayLabel: string;
  dayFullLabel: string;
  dayTotal: number;
  dayCount: number;
}

export interface HourlyDataPoint {
  hourNum: number;
  hourLabel: string;
  hourTotal: number;
  hourCount: number;
}

interface ModernSalesChartProps {
  daily30Days: DailyDataPoint[];
  hourlyToday: HourlyDataPoint[];
  activeRange: RangeType;
  onRangeChange: (range: RangeType) => void;
}

export function ModernSalesChart({
  daily30Days,
  hourlyToday,
  activeRange,
  onRangeChange,
}: ModernSalesChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>("revenue");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("area");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter data based on active range
  const chartData = useMemo(() => {
    if (activeRange === "today") {
      return hourlyToday.map((h) => ({
        label: h.hourLabel,
        fullLabel: `Today at ${h.hourLabel}`,
        revenue: Number(h.hourTotal) || 0,
        orders: Number(h.hourCount) || 0,
        avg: h.hourCount > 0 ? (Number(h.hourTotal) / Number(h.hourCount)) : 0,
      }));
    }

    if (activeRange === "yesterday") {
      // Find yesterday in daily30Days (second to last)
      const yesterday = daily30Days[daily30Days.length - 2] || daily30Days[0];
      return [{
        label: yesterday.dayLabel,
        fullLabel: yesterday.dayFullLabel,
        revenue: Number(yesterday.dayTotal) || 0,
        orders: Number(yesterday.dayCount) || 0,
        avg: yesterday.dayCount > 0 ? (Number(yesterday.dayTotal) / Number(yesterday.dayCount)) : 0,
      }];
    }

    if (activeRange === "7d") {
      return daily30Days.slice(-7).map((d) => ({
        label: d.dayLabel,
        fullLabel: `${d.dayFullLabel} (${d.dayLabel})`,
        revenue: Number(d.dayTotal) || 0,
        orders: Number(d.dayCount) || 0,
        avg: d.dayCount > 0 ? (Number(d.dayTotal) / Number(d.dayCount)) : 0,
      }));
    }

    if (activeRange === "month") {
      // Current calendar month days
      const currentMonth = new Date().getMonth();
      const thisMonthData = daily30Days.filter((d) => new Date(d.dayDate).getMonth() === currentMonth);
      return (thisMonthData.length > 0 ? thisMonthData : daily30Days.slice(-15)).map((d) => ({
        label: d.dayFullLabel.split(" ")[0], // Just day number e.g. "27"
        fullLabel: `${d.dayFullLabel} (${d.dayLabel})`,
        revenue: Number(d.dayTotal) || 0,
        orders: Number(d.dayCount) || 0,
        avg: d.dayCount > 0 ? (Number(d.dayTotal) / Number(d.dayCount)) : 0,
      }));
    }

    // Default: 30 days
    return daily30Days.map((d) => ({
      label: d.dayFullLabel.split(" ")[0],
      fullLabel: `${d.dayFullLabel} (${d.dayLabel})`,
      revenue: Number(d.dayTotal) || 0,
      orders: Number(d.dayCount) || 0,
      avg: d.dayCount > 0 ? (Number(d.dayTotal) / Number(d.dayCount)) : 0,
    }));
  }, [activeRange, daily30Days, hourlyToday]);

  // Extract active values array
  const values = useMemo(() => {
    return chartData.map((d) => {
      if (activeMetric === "revenue") return d.revenue;
      if (activeMetric === "orders") return d.orders;
      return d.avg;
    });
  }, [chartData, activeMetric]);

  const maxVal = Math.max(...values, activeMetric === "revenue" ? 100 : 5);
  // Calculate a clean rounded ceiling (e.g. 500, 1000, 2000, 5000)
  const ceiling = useMemo(() => {
    if (activeMetric === "orders") {
      return Math.max(5, Math.ceil(maxVal / 2) * 2);
    }
    if (maxVal <= 500) return 500;
    if (maxVal <= 1000) return 1000;
    if (maxVal <= 2500) return 2500;
    if (maxVal <= 5000) return 5000;
    return Math.ceil(maxVal / 1000) * 1000;
  }, [maxVal, activeMetric]);

  const totalPeriodRevenue = chartData.reduce((acc, d) => acc + d.revenue, 0);
  const totalPeriodOrders = chartData.reduce((acc, d) => acc + d.orders, 0);
  const avgPeriodValue = totalPeriodOrders > 0 ? totalPeriodRevenue / totalPeriodOrders : 0;

  // Best / Peak data point
  const peakPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((prev, curr) => {
      const prevVal = activeMetric === "revenue" ? prev.revenue : activeMetric === "orders" ? prev.orders : prev.avg;
      const currVal = activeMetric === "revenue" ? curr.revenue : activeMetric === "orders" ? curr.orders : curr.avg;
      return currVal > prevVal ? curr : prev;
    }, chartData[0]);
  }, [chartData, activeMetric]);

  // SVG Geometry Calculations
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartInnerWidth = svgWidth - paddingLeft - paddingRight;
  const chartInnerHeight = svgHeight - paddingTop - paddingBottom;

  // Compute point coordinates
  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    if (chartData.length === 1) {
      const x = paddingLeft + chartInnerWidth / 2;
      const y = paddingTop + chartInnerHeight - (values[0] / ceiling) * chartInnerHeight;
      return [{ x, y, data: chartData[0], val: values[0] }];
    }

    const step = chartInnerWidth / (chartData.length - 1);
    return chartData.map((d, i) => {
      const x = paddingLeft + i * step;
      const y = paddingTop + chartInnerHeight - (values[i] / ceiling) * chartInnerHeight;
      return { x, y, data: d, val: values[i] };
    });
  }, [chartData, values, ceiling, chartInnerWidth, chartInnerHeight]);

  // Generate smooth cubic bezier SVG path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "" };
    if (points.length === 1) {
      const p = points[0];
      return {
        linePath: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y}`,
        areaPath: `M ${p.x - 20} ${p.y} L ${p.x + 20} ${p.y} L ${p.x + 20} ${paddingTop + chartInnerHeight} L ${p.x - 20} ${paddingTop + chartInnerHeight} Z`,
      };
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const baseLine = paddingTop + chartInnerHeight;
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const a = `${d} L ${lastX} ${baseLine} L ${firstX} ${baseLine} Z`;

    return { linePath: d, areaPath: a };
  }, [points, chartInnerHeight]);

  // Format axis labels
  const formatVal = (v: number) => {
    if (activeMetric === "revenue") {
      return v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`;
    }
    if (activeMetric === "orders") {
      return `${v}`;
    }
    return `₹${v.toFixed(0)}`;
  };

  const hoveredPoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-5 transition-all">
      {/* Top Header: Title, Range Controls, and Metric Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base tracking-tight flex items-center gap-2">
                Sales Analytics & Trends
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {activeRange === "today"
                  ? "Real-time hourly activity for today"
                  : activeRange === "7d"
                  ? "Daily performance across the last 7 days"
                  : activeRange === "30d"
                  ? "Comprehensive 30-day billing trajectory"
                  : activeRange === "month"
                  ? "Month-to-date sales performance"
                  : "Yesterday's completed sales"}
              </p>
            </div>
          </div>
        </div>

        {/* Option Tabs (Range Selector) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/70">
          {(
            [
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "month", label: "This Month" },
            ] as const
          ).map((t) => {
            const isActive = activeRange === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onRangeChange(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric Selector Bar & Insights Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
        {/* Metric Switcher */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Metric:
          </span>
          <button
            type="button"
            onClick={() => setActiveMetric("revenue")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeMetric === "revenue"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Revenue (₹)
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("orders")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeMetric === "orders"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Orders Count
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("avg")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeMetric === "avg"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Avg Bill
          </button>
        </div>

        {/* Chart Style Toggle (Area vs Bar) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center p-0.5 bg-white rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setChartStyle("area")}
              title="Area Curve View"
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                chartStyle === "area"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartStyle("bar")}
              title="Bar Chart View"
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                chartStyle === "bar"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {peakPoint && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-bold">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Peak: {peakPoint.label} (
                {activeMetric === "revenue"
                  ? `₹${peakPoint.revenue.toFixed(0)}`
                  : activeMetric === "orders"
                  ? `${peakPoint.orders} bills`
                  : `₹${peakPoint.avg.toFixed(0)}`}
                )
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Responsive Chart Container */}
      <div className="relative pt-2 select-none">
        {chartStyle === "area" ? (
          /* SVG Gradient Area Curve */
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-56 sm:h-64 overflow-visible"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1d4ed8" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563eb" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Y-Axis Grid Lines & Labels */}
              {[1, 0.75, 0.5, 0.25, 0].map((step, idx) => {
                const y = paddingTop + chartInnerHeight * (1 - step);
                const labelVal = Math.round(ceiling * step);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray={step === 0 ? "0" : "3 4"}
                      strokeWidth={step === 0 ? "1.5" : "1"}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 font-mono text-[10px]"
                    >
                      {formatVal(labelVal)}
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient Fill */}
              {areaPath && (
                <path d={areaPath} fill="url(#areaGradient)" className="transition-all duration-300" />
              )}

              {/* Smooth Spline Stroke */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#strokeGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  className="transition-all duration-300"
                />
              )}

              {/* Hover Guideline */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={paddingTop}
                  x2={hoveredPoint.x}
                  y2={paddingTop + chartInnerHeight}
                  stroke="#2563eb"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="pointer-events-none"
                />
              )}

              {/* Interactive Points and X-Axis Labels */}
              {points.map((pt, idx) => {
                const isHovered = hoveredIndex === idx;
                // Show X labels selectively if there are too many (e.g. 30 days)
                const showLabel =
                  points.length <= 15 ||
                  idx === 0 ||
                  idx === points.length - 1 ||
                  idx % Math.ceil(points.length / 10) === 0;

                return (
                  <g key={idx}>
                    {/* Hover Catch Target (invisible wide circle) */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="16"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Visual Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? "6" : points.length > 20 ? "2.5" : "4"}
                      fill={isHovered ? "#2563eb" : "#ffffff"}
                      stroke="#2563eb"
                      strokeWidth={isHovered ? "3" : "2"}
                      className="transition-all duration-150 pointer-events-none"
                    />

                    {/* X-Axis Tick Label */}
                    {showLabel && (
                      <text
                        x={pt.x}
                        y={paddingTop + chartInnerHeight + 18}
                        textAnchor="middle"
                        className={`text-[10px] font-bold ${
                          isHovered ? "fill-blue-600 font-extrabold" : "fill-slate-500"
                        }`}
                      >
                        {pt.data.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          /* Interactive Bar Chart Mode */
          <div className="h-56 sm:h-64 flex items-end gap-1.5 sm:gap-3 pl-12 pr-4 pb-6 pt-4 relative border-b border-slate-200">
            {/* Background Lines */}
            <div className="absolute inset-0 pl-12 flex flex-col justify-between pointer-events-none pb-7 pt-4">
              {[ceiling, ceiling * 0.75, ceiling * 0.5, ceiling * 0.25, 0].map((val, i) => (
                <div key={i} className="flex items-center w-full">
                  <span className="text-[10px] text-slate-400 font-mono w-10 text-right pr-2 shrink-0 -ml-12">
                    {formatVal(Math.round(val))}
                  </span>
                  <div className="flex-1 border-b border-dashed border-slate-200" />
                </div>
              ))}
            </div>

            {/* Bars */}
            {chartData.map((d, index) => {
              const val = values[index];
              const pct = ceiling > 0 ? (val / ceiling) * 100 : 0;
              const isHovered = hoveredIndex === index;
              const isPeak = peakPoint && d.label === peakPoint.label && val > 0;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative z-10"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="w-full max-w-[40px] flex flex-col justify-end items-center">
                    {val > 0 ? (
                      <div
                        style={{ height: `${Math.max(8, Math.min(100, pct))}%` }}
                        className={`w-full rounded-t-md transition-all duration-200 shadow-xs ${
                          isPeak
                            ? "bg-gradient-to-t from-blue-700 to-indigo-500 ring-2 ring-indigo-400/40"
                            : "bg-gradient-to-t from-blue-600 to-sky-400 group-hover:from-blue-700 group-hover:to-sky-500"
                        } ${isHovered ? "brightness-110 scale-y-105" : ""}`}
                      />
                    ) : (
                      <div className="w-full h-1 bg-slate-200 rounded-full" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-2 block truncate w-full text-center">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-30 bg-slate-900 text-white rounded-xl p-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all border border-slate-700/60"
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${Math.max(10, (hoveredPoint.y / svgHeight) * 100 - 15)}%`,
            }}
          >
            <div className="text-[11px] font-semibold text-slate-400 pb-1 border-b border-slate-800">
              {hoveredPoint.data.fullLabel}
            </div>
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center justify-between gap-4 text-xs font-bold">
                <span className="text-slate-300">Revenue:</span>
                <span className="text-blue-400 font-mono">
                  ₹{hoveredPoint.data.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-400">Total Bills:</span>
                <span className="text-white font-bold">{hoveredPoint.data.orders} bills</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-400">Avg Bill:</span>
                <span className="text-emerald-400 font-bold">₹{hoveredPoint.data.avg.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">
            Period Total Sales
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
            ₹{totalPeriodRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">
            Completed Orders
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
            {totalPeriodOrders} transactions
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 block">
            Average Order Value
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
            ₹{avgPeriodValue.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
