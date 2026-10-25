"use client";

import { useState } from "react";
import { TrendingUp, Calendar, ArrowUpRight, Sparkles } from "lucide-react";

export interface DaySaleData {
  dayDate: string;
  dayLabel: string;
  dayTotal: number;
  billsCount?: number;
}

interface SalesTrendChartProps {
  data: DaySaleData[];
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totals = data.map((d) => Number(d.dayTotal) || 0);
  const maxTotal = Math.max(...totals, 500);
  // Round max ceiling up to clean round number (e.g. 500, 1000, 2000, 3000)
  const ceiling = Math.ceil(maxTotal / 500) * 500;
  const gridSteps = [ceiling, Math.round(ceiling * 0.66), Math.round(ceiling * 0.33), 0];

  const totalWeekSales = totals.reduce((a, b) => a + b, 0);
  const bestDay = data.reduce((prev, curr) => (curr.dayTotal > prev.dayTotal ? curr : prev), data[0] || { dayLabel: "N/A", dayTotal: 0 });

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-black text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Daily Sales Trend (Last 7 Days)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Total 7-day revenue: <strong className="text-slate-900 font-bold">₹{totalWeekSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            {bestDay.dayTotal > 0 && (
              <span className="hidden sm:inline text-slate-400 ml-2">
                · Best: {bestDay.dayLabel} (₹{bestDay.dayTotal.toFixed(0)})
              </span>
            )}
          </p>
        </div>

        {/* Legend / Hover indicator */}
        <div className="text-right">
          {hoveredIdx !== null && data[hoveredIdx] ? (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-bold animate-in fade-in">
              <span>{data[hoveredIdx].dayLabel}</span>
              <span className="text-blue-600">₹{Number(data[hoveredIdx].dayTotal).toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Hover on bars for details</span>
          )}
        </div>
      </div>

      {/* Responsive Visual Bar Chart Area */}
      <div className="relative pt-4 pb-1">
        {/* Y-Axis Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7 pt-4">
          {gridSteps.map((val, i) => (
            <div key={i} className="flex items-center w-full">
              <span className="text-[10px] text-slate-400 font-mono w-12 text-right pr-2 shrink-0">
                ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </span>
              <div className="flex-1 border-b border-dashed border-slate-200" />
            </div>
          ))}
        </div>

        {/* Bars Container */}
        <div className="h-48 pl-12 flex items-end gap-2 sm:gap-4 relative z-10">
          {data.map((item, index) => {
            const amount = Number(item.dayTotal) || 0;
            const percent = ceiling > 0 ? (amount / ceiling) * 100 : 0;
            const isHovered = hoveredIdx === index;
            const isToday = index === data.length - 1;

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Floating tooltip on hover */}
                {isHovered && (
                  <div className="absolute -top-11 z-30 bg-slate-900 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap pointer-events-none transform -translate-y-1 transition-transform">
                    <div>₹{amount.toFixed(2)}</div>
                    <div className="text-[9px] text-slate-300 font-normal">{item.dayLabel}</div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-slate-900 rotate-45" />
                  </div>
                )}

                {/* Amount text always visible above active/high bars */}
                {amount > 0 && !isHovered && (
                  <span className="text-[10px] font-bold text-slate-600 mb-1 leading-none select-none">
                    ₹{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}
                  </span>
                )}

                {/* The Bar */}
                <div className="w-full max-w-[42px] flex flex-col justify-end items-center">
                  {amount > 0 ? (
                    <div
                      style={{ height: `${Math.max(12, Math.min(100, percent))}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 relative shadow-xs ${
                        isToday
                          ? "bg-gradient-to-t from-blue-700 to-blue-500 ring-2 ring-blue-400/40"
                          : "bg-gradient-to-t from-blue-600 to-sky-400 group-hover:from-blue-700 group-hover:to-sky-500"
                      } ${isHovered ? "brightness-110 scale-y-105" : ""}`}
                    >
                      {isToday && (
                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400 animate-ping pointer-events-none" />
                      )}
                    </div>
                  ) : (
                    /* Subtle pill for zero sales day so it looks intentional, not broken */
                    <div className="w-full h-1.5 bg-slate-200 rounded-full group-hover:bg-slate-300 transition-colors" />
                  )}
                </div>

                {/* Day Label at Bottom */}
                <div className="mt-2 text-center select-none">
                  <span
                    className={`text-[11px] font-bold block ${
                      isToday
                        ? "text-blue-600 font-black"
                        : isHovered
                        ? "text-slate-900"
                        : "text-slate-500"
                    }`}
                  >
                    {item.dayLabel}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-extrabold uppercase tracking-tight text-blue-600 bg-blue-50 px-1 rounded block -mt-0.5">
                      Today
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
