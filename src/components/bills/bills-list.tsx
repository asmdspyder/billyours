"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  History,
  Search,
  Printer,
  Eye,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  FileText,
} from "lucide-react";

interface BillSummary {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string | null;
  grandTotal: string;
  paymentStatus?: "PAID" | "UNPAID";
  paymentMethod: string;
  status: "COMPLETED" | "CANCELLED";
  completedAt: string;
}

interface BillsListProps {
  bills: BillSummary[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  currentSearch: string;
  currentPayment: string;
  currentStatus: string;
}

export function BillsList({
  bills,
  currentPage,
  totalPages,
  totalCount,
  currentSearch,
  currentPayment,
  currentStatus,
}: BillsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Bill History</h1>
          <p className="text-xs md:text-sm text-slate-500">
            View, print, reprint, or share past bills and receipts ({totalCount} total).
          </p>
        </div>
        <Link
          href="/app/billing"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm self-start sm:self-auto"
        >
          <span>+ Create New Bill</span>
        </Link>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bill number (e.g. BY-2026-000001) or customer..."
            defaultValue={currentSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFilterChange("search", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => handleFilterChange("search", e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Payment Method Filter */}
          <select
            value={currentPayment}
            onChange={(e) => handleFilterChange("payment", e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 md:flex-initial"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Bill Status Filter */}
          <select
            value={currentStatus}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 md:flex-initial"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {bills.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-semibold text-sm">No bills found</p>
            <p className="text-slate-400 text-xs mt-1">
              {currentSearch || currentPayment !== "ALL" || currentStatus !== "ALL"
                ? "Try clearing your filters to see more bills."
                : "Complete your first bill to see it here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Bill Number</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-center">Payment Mode</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/bills/${b.id}`}
                        className="font-mono font-bold text-blue-600 hover:underline"
                      >
                        {b.billNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {b.completedAt}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      <div>{b.customerName}</div>
                      {b.customerPhone && (
                        <div className="text-[11px] text-slate-400 font-mono">{b.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      ₹{b.grandTotal}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {b.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          b.status === "COMPLETED"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/app/bills/${b.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                      <Link
                        href={`/app/bills/${b.id}?print=1`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-900 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
