"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Plus, Phone, Eye, X, AlertCircle } from "lucide-react";
import { createCustomerAction } from "@/actions/customer-actions";
import { DataTable } from "@/components/ui/data-table";
import { AppModal } from "@/components/ui/app-modal";
import { AppSearch } from "@/components/ui/app-search";

interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  totalBills: number;
  totalSpent: string;
  lastVisit: string;
}

interface CustomersListProps {
  customers: CustomerSummary[];
  currentSearch: string;
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
}

export function CustomersList({
  customers,
  currentSearch,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
}: CustomersListProps) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchValue, setSearchValue] = useState(currentSearch);
  const [displayCustomers, setDisplayCustomers] = useState(customers);
  const [displayPage, setDisplayPage] = useState(currentPage);
  const [displayTotalPages, setDisplayTotalPages] = useState(totalPages);
  const [displayTotalCount, setDisplayTotalCount] = useState(totalCount);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const requestedSearchRef = useRef(currentSearch);
  const searchValueRef = useRef(currentSearch);
  const activeSearchTermRef = useRef<string | null>(null);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    searchRequestIdRef.current += 1;
    activeSearchTermRef.current = null;
    setIsSearching(false);
    setSearchError(null);
    setDisplayCustomers(customers);
    setDisplayPage(currentPage);
    setDisplayTotalPages(totalPages);
    setDisplayTotalCount(totalCount);
    setSearchValue(currentSearch);
    searchValueRef.current = currentSearch;
    requestedSearchRef.current = currentSearch;
  }, [customers, currentPage, currentSearch, totalPages, totalCount]);

  useEffect(() => {
    const term = searchValue.trim();
    if (term === requestedSearchRef.current) return;
    const timeout = window.setTimeout(() => {
      void searchCustomers(term);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  const searchCustomers = async (term: string) => {
    const requestId = ++searchRequestIdRef.current;
    requestedSearchRef.current = term;
    activeSearchTermRef.current = term;
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/app/customers/search?search=${encodeURIComponent(term)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Could not search customers. Please try again.");
      const result = (await response.json()) as {
        customers: CustomerSummary[];
        totalCount: number;
        totalPages: number;
      };
      if (requestId !== searchRequestIdRef.current) return;
      setDisplayCustomers(result.customers);
      setDisplayPage(1);
      setDisplayTotalPages(result.totalPages);
      setDisplayTotalCount(result.totalCount);
      const url = new URL(window.location.href);
      if (term) url.searchParams.set("search", term);
      else url.searchParams.delete("search");
      url.searchParams.delete("page");
      window.history.replaceState(null, "", url);
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return;
      setSearchError(error instanceof Error ? error.message : "Could not search customers.");
    } finally {
      if (requestId === searchRequestIdRef.current) {
        activeSearchTermRef.current = null;
        setIsSearching(false);
      }
    }
  };

  const updateSearch = (value: string) => {
    const term = value.trim();
    if (term !== searchValueRef.current.trim()) {
      searchRequestIdRef.current += 1;
      activeSearchTermRef.current = null;
    }
    searchValueRef.current = value;
    setSearchValue(value);
    setIsSearching(term !== requestedSearchRef.current || activeSearchTermRef.current === term);
    setSearchError(null);
  };

  const handleCreateCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createCustomerAction(formData);
      if (res.success) {
        setShowAddModal(false);
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Failed to create customer.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-xs md:text-sm text-slate-500">
            View customer purchase history, contact numbers, and total spending.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm self-start sm:self-auto transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <AppSearch
        value={searchValue}
        onChange={updateSearch}
        onSearch={(term) => void searchCustomers(term.trim())}
        placeholder="Search customer name or mobile number"
        ariaLabel="Search customers"
        isSearching={isSearching}
      />
      {searchError && <p className="text-xs text-red-600" role="alert">{searchError}</p>}

      {/* Customers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {displayCustomers.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-semibold text-sm">No customers found</p>
            <p className="text-slate-400 text-xs mt-1">
              Customers are automatically saved when you enter their mobile number during billing.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List: Fits 100% width with zero horizontal scrolling */}
            <div className="grid gap-3 bg-slate-50/70 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">
              {displayCustomers.map((c) => (
                <Link
                  key={c.id}
                  href={`/app/customers/${c.id}`}
                  className="block min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-colors hover:border-slate-300 active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words font-bold text-sm text-slate-900 hover:text-blue-600">
                        {c.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="break-all">{c.phone}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        ₹{c.totalSpent}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.totalBills} bill{c.totalBills === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                    <span className="min-w-0 truncate">Last visit: {c.lastVisit}</span>
                    <span className="flex shrink-0 items-center gap-1 font-semibold text-blue-600">
                      <span>History</span>
                      <Eye className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden lg:block">
              <DataTable
                minWidth="min-w-[1040px]"
                columns={[
                  { label: "Customer" },
                  { label: "Mobile" },
                  { label: "Bills", align: "center" },
                  { label: "Total spent", align: "right" },
                  { label: "Last visit" },
                  { label: "History", align: "right" },
                ]}
                rows={displayCustomers.map((c) => ({
                  key: c.id,
                  cells: [
                    <Link key="name" href={`/app/customers/${c.id}`} className="font-semibold text-slate-900 hover:text-blue-600">
                      {c.name}
                    </Link>,
                    <span key="phone" className="font-mono text-xs text-slate-600">{c.phone}</span>,
                    <span key="bills" className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {c.totalBills}
                    </span>,
                    <span key="spent" className="font-bold text-slate-900">₹{c.totalSpent}</span>,
                    <span key="visit" className="whitespace-nowrap text-xs text-slate-500">{c.lastVisit}</span>,
                    <Link
                      key="history"
                      href={`/app/customers/${c.id}`}
                      className="ml-auto inline-flex h-8 items-center justify-end gap-1 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      History
                    </Link>,
                  ],
                }))}
              />
            </div>

            {/* Pagination Controls */}
            {displayTotalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="text-center text-xs text-slate-500 sm:text-left">
                  Showing <span className="font-semibold text-slate-700">{(displayPage - 1) * 25 + 1}</span> to{" "}
                  <span className="font-semibold text-slate-700">{Math.min(displayPage * 25, displayTotalCount)}</span> of{" "}
                  <span className="font-semibold text-slate-700">{displayTotalCount}</span> customers
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                  <button
                    disabled={displayPage <= 1}
                    onClick={() => {
                      const prevPage = displayPage - 1;
                      router.push(
                        `/app/customers?page=${prevPage}${searchValue.trim() ? `&search=${encodeURIComponent(searchValue.trim())}` : ""}`
                      );
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-600 px-1 font-medium">
                    Page {displayPage} of {displayTotalPages}
                  </span>
                  <button
                    disabled={displayPage >= displayTotalPages}
                    onClick={() => {
                      const nextPage = displayPage + 1;
                      router.push(
                        `/app/customers?page=${nextPage}${searchValue.trim() ? `&search=${encodeURIComponent(searchValue.trim())}` : ""}`
                      );
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AppModal title="Add New Customer" subtitle="Create a customer profile for future bills" onClose={() => setShowAddModal(false)}>
          {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="app-modal space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter mobile number"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Enter preferences or additional notes"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  {isPending ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
        </AppModal>
      )}
    </div>
  );
}
