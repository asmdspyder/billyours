"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Printer,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  ChevronDown,
  LoaderCircle,
  X,
  SlidersHorizontal,
  CalendarDays,
} from "lucide-react";
import { deleteBillAction } from "@/actions/billing-actions";
import { AppLoader } from "@/components/ui/app-loader";
import { DataTable } from "@/components/ui/data-table";
import { WhatsAppBillShare } from "@/components/bills/whatsapp-bill-share";
import { AppFeedbackDialog } from "@/components/ui/app-feedback-dialog";

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

interface MultiSelectFilterProps {
  label: string;
  selectedValues: string[];
  options: { value: string; label: string }[];
  onChange: (values: string[]) => void;
  variant?: "dropdown" | "list";
}

function MultiSelectFilter({
  label,
  selectedValues,
  options,
  onChange,
  variant = "dropdown",
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const filterId = label.toLowerCase().replace(/\s+/g, "-");
  const allLabel = label === "Bill status" ? "All statuses" : "All payment methods";
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  useEffect(() => {
    if (!isOpen || variant === "list") return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, variant]);

  const toggleOption = (value: string) => {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((selected) => selected !== value)
      : [...selectedValues, value];
    onChange(next);
  };

  return (
    <div ref={containerRef} className="relative min-w-0 w-full">
      <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-wide ${variant === "list" ? "text-slate-600" : "text-slate-500"}`}>
        {label}
      </div>
      {variant === "dropdown" ? (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={`${filterId}-options`}
          onClick={() => setIsOpen((open) => !open)}
          className={`flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600/20 ${
            selectedValues.length ? "border-blue-300 text-blue-800" : "border-slate-300 text-slate-700 hover:border-slate-400"
          }`}
        >
          <span className="truncate">
            {selectedLabels.length ? selectedLabels.join(", ") : allLabel}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {selectedValues.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1 text-[10px] font-bold text-blue-700">
                {selectedValues.length}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {options.map((option) => {
            const checked = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  checked ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? selectedValues.filter((selected) => selected !== option.value)
                      : [...selectedValues, option.value];
                    onChange(next);
                  }}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      )}
      {variant === "dropdown" && isOpen && (
        <div
          id={`${filterId}-options`}
          role="group"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {options.map((option) => {
            const checked = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOption(option.value)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
                />
                {option.label}
              </label>
            );
          })}
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full border-t border-slate-100 px-2.5 pt-2 text-left text-[11px] font-semibold text-blue-700 hover:text-blue-800"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface BillsListProps {
  bills: BillSummary[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  currentSearch: string;
  currentPayment: string[];
  currentStatus: string[];
  currentStartDate: string;
  currentEndDate: string;
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
  currentStartDate,
  currentEndDate,
  businessName,
  googleReviewLink,
}: BillsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFiltering, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [billToCancel, setBillToCancel] = useState<{ id: string; number: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("Cancelled by user");
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [paymentFilters, setPaymentFilters] = useState(currentPayment);
  const [statusFilters, setStatusFilters] = useState(currentStatus);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const currentPaymentKey = currentPayment.join(",");
  const currentStatusKey = currentStatus.join(",");
  const currentQueryString = searchParams.toString();
  const queryParamsRef = useRef(currentQueryString);

  useEffect(() => {
    setSearchValue(currentSearch);
    setPaymentFilters(currentPayment);
    setStatusFilters(currentStatus);
    setStartDate(currentStartDate);
    setEndDate(currentEndDate);
    queryParamsRef.current = currentQueryString;
  }, [currentSearch, currentPaymentKey, currentStatusKey, currentStartDate, currentEndDate, currentQueryString]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileFiltersOpen]);

  const handleDeleteBill = async () => {
    if (!billToCancel || !cancelReason.trim()) return;

    const billId = billToCancel.id;
    setDeletingId(billId);
    try {
      const res = await deleteBillAction(billId, cancelReason.trim());
      if (res.success) {
        setBillToCancel(null);
        startTransition(() => {
          router.refresh();
        });
      } else {
        setFeedbackMessage(res.error || "Failed to delete bill.");
      }
    } catch (err) {
      setFeedbackMessage(
        err instanceof Error ? err.message : "An unexpected error occurred while deleting bill."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterChange = (key: string, value: string | string[]) => {
    const params = new URLSearchParams(queryParamsRef.current);
    if (Array.isArray(value) ? value.length > 0 : value.trim().length > 0) {
      params.set(key, Array.isArray(value) ? value.join(",") : value.trim());
    } else {
      params.delete(key);
    }
    params.delete("page");
    queryParamsRef.current = params.toString();
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(queryParamsRef.current);
    params.set("page", String(newPage));
    queryParamsRef.current = params.toString();
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(queryParamsRef.current);
    ["search", "payment", "status", "startDate", "endDate", "page"].forEach((key) => params.delete(key));
    queryParamsRef.current = params.toString();
    setSearchValue("");
    setPaymentFilters([]);
    setStatusFilters([]);
    setStartDate("");
    setEndDate("");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const hasFilters = Boolean(
    currentSearch || currentPayment.length || currentStatus.length || currentStartDate || currentEndDate
  );
  const activeFilterCount =
    currentPayment.length +
    currentStatus.length +
    Number(Boolean(currentStartDate)) +
    Number(Boolean(currentEndDate));

  const renderFilterFields = (variant: "dropdown" | "list") => (
    <>
      <MultiSelectFilter
        label="Payment method"
        selectedValues={paymentFilters}
        options={[
          { value: "CASH", label: "Cash" },
          { value: "UPI", label: "UPI" },
          { value: "CARD", label: "Card" },
        ]}
        variant={variant}
        onChange={(values) => {
          setPaymentFilters(values);
          handleFilterChange("payment", values);
        }}
      />
      <MultiSelectFilter
        label="Bill status"
        selectedValues={statusFilters}
        options={[
          { value: "COMPLETED", label: "Completed" },
          { value: "CANCELLED", label: "Cancelled" },
        ]}
        variant={variant}
        onChange={(values) => {
          setStatusFilters(values);
          handleFilterChange("status", values);
        }}
      />
      <label className="block min-w-0">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">From date</span>
        <span className="relative block">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" aria-hidden="true" />
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => {
              setStartDate(event.target.value);
              handleFilterChange("startDate", event.target.value);
            }}
            className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-[#fbfcfe] pl-9 pr-2 text-xs font-medium text-slate-700 outline-none transition hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            aria-label="Start date"
          />
        </span>
      </label>
      <label className="block min-w-0">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">To date</span>
        <span className="relative block">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" aria-hidden="true" />
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => {
              setEndDate(event.target.value);
              handleFilterChange("endDate", event.target.value);
            }}
            className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-[#fbfcfe] pl-9 pr-2 text-xs font-medium text-slate-700 outline-none transition hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            aria-label="End date"
          />
        </span>
      </label>
    </>
  );

  const renderSearch = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleFilterChange("search", searchValue);
      }}
      className="relative min-w-0"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Bill no. or customer"
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-[#fbfcfe] pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-500 outline-none transition hover:border-blue-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        aria-label="Search bills by bill number, customer, or phone"
      />
      <button
        type="submit"
        aria-label="Search bills"
        disabled={isFiltering}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-70"
      >
        {isFiltering ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Search className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </form>
  );

  return (
    <div className="space-y-3">
      <AppFeedbackDialog message={feedbackMessage} onClose={() => setFeedbackMessage(null)} />
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
      <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">{renderSearch()}</div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            aria-label={activeFilterCount ? `Open filters, ${activeFilterCount} active` : "Open filters"}
            className={`relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
              activeFilterCount
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <div className={`fixed inset-0 z-[80] ${mobileFiltersOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!mobileFiltersOpen}>
        <button
          type="button"
          tabIndex={mobileFiltersOpen ? 0 : -1}
          aria-label="Close filters"
          onClick={() => setMobileFiltersOpen(false)}
          className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-300 ${
            mobileFiltersOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          inert={!mobileFiltersOpen}
          className={`absolute inset-y-0 right-0 flex w-[min(90vw,27rem)] flex-col border-l border-slate-200 bg-[#fbfaf7] shadow-2xl transition-transform duration-300 ease-out ${
            mobileFiltersOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="Bill history filters"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Filters</h2>
              <p className="text-[11px] text-slate-500">Narrow down your bill history</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="Close filters"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {renderFilterFields("list")}
          </div>
          <div className="flex gap-2 border-t border-slate-200 bg-white p-4">
            <button
              type="button"
              disabled={!hasFilters}
              onClick={clearFilters}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </aside>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {bills.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-semibold text-sm">No bills found</p>
            <p className="text-slate-400 text-xs mt-1">
              {hasFilters
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
                        onClick={() => {
                          setCancelReason("Cancelled by user");
                          setBillToCancel({ id: b.id, number: b.billNumber });
                        }}
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
                          onClick={() => {
                            setCancelReason("Cancelled by user");
                            setBillToCancel({ id: b.id, number: b.billNumber });
                          }}
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
      {billToCancel && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingId) setBillToCancel(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-bill-title"
            aria-describedby="cancel-bill-description"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleDeleteBill();
              }}
            >
              <div className="space-y-4 p-5">
                <div>
                  <h2 id="cancel-bill-title" className="text-base font-bold text-slate-900">
                    Cancel bill {billToCancel.number}?
                  </h2>
                  <p id="cancel-bill-description" className="mt-1 text-sm leading-6 text-slate-600">
                    The bill will be marked as cancelled. Enter a reason to continue.
                  </p>
                </div>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700">Cancellation reason</span>
                  <textarea
                    autoFocus
                    required
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    disabled={Boolean(deletingId)}
                    rows={3}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </label>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => setBillToCancel(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Keep bill
                </button>
                <button
                  type="submit"
                  disabled={Boolean(deletingId) || !cancelReason.trim()}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {deletingId ? "Cancelling..." : "Cancel bill"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
