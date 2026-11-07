"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  History,
  Search,
  Printer,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  FileText,
} from "lucide-react";
import { deleteBillAction } from "@/actions/billing-actions";
import { AppLoader } from "@/components/ui/app-loader";
import { DataTable } from "@/components/ui/data-table";
import { WhatsAppBillShare } from "@/components/bills/whatsapp-bill-share";

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
  businessName: string;
  googleReviewLink?: string | null;
}

export function BillsList({
  bills,
  currentPage,
  totalPages,
  totalCount,
  currentSearch,
  currentPayment,
  currentStatus,
  businessName,
  googleReviewLink,
}: BillsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFiltering, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteBill = async (billId: string, billNumber: string) => {
    const reason = window.prompt(
      `Are you sure you want to delete bill ${billNumber}? It will be soft-deleted and marked as Cancelled.\n\nEnter reason:`,
      "Cancelled by user"
    );
    if (!reason) return;

    setDeletingId(billId);
    try {
      const res = await deleteBillAction(billId, reason.trim());
      if (res.success) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        alert(res.error || "Failed to delete bill.");
      }
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred while deleting bill.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to page 1 on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
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
          {isFiltering && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold px-2">
              <AppLoader size="sm" label="Filtering..." />
            </div>
          )}
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
          <>
            <div className="grid gap-3 bg-slate-50/70 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">
              {bills.map((b) => (
                <div
                  key={b.id}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-colors hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/app/bills/${b.id}?from=history`}
                      className="break-all font-mono text-xs font-bold text-blue-700 hover:underline"
                    >
                      {b.billNumber}
                    </Link>
                    <span className="shrink-0 text-sm font-extrabold text-slate-900">
                      ₹{b.grandTotal}
                    </span>
                  </div>
                  <div className="mt-3 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Customer</p>
                    <p className="break-words text-sm font-semibold text-slate-900">{b.customerName}</p>
                    {b.customerPhone && (
                      <p className="mt-0.5 break-all font-mono text-[11px] text-slate-500">{b.customerPhone}</p>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                      {b.paymentMethod}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        b.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "border border-red-200 bg-red-50 text-red-600"
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="ml-auto text-right text-[11px] text-slate-500">{b.completedAt}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                    <Link
                      href={`/app/bills/${b.id}?from=history`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View bill
                    </Link>
                    <Link
                      href={`/app/bills/${b.id}?print=1`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </Link>
                    <WhatsAppBillShare
                      billId={b.id}
                      billNumber={b.billNumber}
                      customerName={b.customerName}
                      customerPhone={b.customerPhone}
                      businessName={businessName}
                      grandTotal={b.grandTotal}
                      googleReviewLink={googleReviewLink}
                      compact
                      label="WhatsApp"
                      className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                    />
                    {b.status === "COMPLETED" && (
                      <button
                        type="button"
                        disabled={deletingId === b.id}
                        onClick={() => handleDeleteBill(b.id, b.billNumber)}
                        className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200/70 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                        title="Delete / cancel bill"
                      >
                        {deletingId === b.id ? <AppLoader size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Cancel bill
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block">
              <DataTable
                minWidth="min-w-[1040px]"
                columns={[
                  { label: "Bill number" },
                  { label: "Date & time" },
                  { label: "Customer" },
                  { label: "Grand total", align: "right" },
                  { label: "Payment", align: "center" },
                  { label: "Status", align: "center" },
                  { label: "Actions", align: "right", className: "min-w-[260px]" },
                ]}
                rows={bills.map((b) => ({
                  key: b.id,
                  cells: [
                    <Link key="number" href={`/app/bills/${b.id}?from=history`} className="font-mono font-bold text-blue-700 hover:underline">
                      {b.billNumber}
                    </Link>,
                    <span key="date" className="whitespace-nowrap text-xs text-slate-500">{b.completedAt}</span>,
                    <div key="customer" className="min-w-0">
                      <p className="font-medium text-slate-900">{b.customerName}</p>
                      {b.customerPhone && <p className="font-mono text-[11px] text-slate-500">{b.customerPhone}</p>}
                    </div>,
                    <span key="total" className="font-bold text-slate-900">₹{b.grandTotal}</span>,
                    <span key="payment" className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{b.paymentMethod}</span>,
                    <span
                      key="status"
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        b.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-600"
                      }`}
                    >
                      {b.status}
                    </span>,
                    <div key="actions" className="grid min-w-[250px] grid-cols-2 gap-1.5">
                      <Link
                        href={`/app/bills/${b.id}?from=history`}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      <Link
                        href={`/app/bills/${b.id}?print=1`}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print
                      </Link>
                      <WhatsAppBillShare
                        billId={b.id}
                        billNumber={b.billNumber}
                        customerName={b.customerName}
                        customerPhone={b.customerPhone}
                        businessName={businessName}
                        grandTotal={b.grandTotal}
                        googleReviewLink={googleReviewLink}
                        compact
                        label="Share"
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                      />
                      {b.status === "COMPLETED" && (
                        <button
                          type="button"
                          disabled={deletingId === b.id}
                          onClick={() => handleDeleteBill(b.id, b.billNumber)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200/70 bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === b.id ? <AppLoader size="sm" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Cancel
                        </button>
                      )}
                    </div>,
                  ],
                }))}
              />
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 p-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
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
