"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Plus, Phone, Eye, X, AlertCircle, Search } from "lucide-react";
import { createCustomerAction } from "@/actions/customer-actions";
import { DataTable } from "@/components/ui/data-table";
import { AppModal } from "@/components/ui/app-modal";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    if (searchValue === currentSearch) return;
    const timeout = window.setTimeout(() => {
      startTransition(() => handleSearch(searchValue));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchValue, currentSearch]);

  const handleSearch = (term: string) => {
    if (term.trim()) {
      router.replace(`/app/customers?search=${encodeURIComponent(term.trim())}`);
    } else {
      router.replace("/app/customers");
    }
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
      <div className="w-full rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(() => handleSearch(searchValue));
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search customer name or mobile number"
            aria-label="Search customers"
            className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-20 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                startTransition(() => handleSearch(""));
              }}
              aria-label="Clear search"
              className="absolute right-11 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-1 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {customers.length === 0 ? (
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
              {customers.map((c) => (
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
                rows={customers.map((c) => ({
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
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="text-center text-xs text-slate-500 sm:text-left">
                  Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * 25 + 1}</span> to{" "}
                  <span className="font-semibold text-slate-700">{Math.min(currentPage * 25, totalCount)}</span> of{" "}
                  <span className="font-semibold text-slate-700">{totalCount}</span> customers
                </div>
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => {
                      const prevPage = currentPage - 1;
                      router.push(
                        `/app/customers?page=${prevPage}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ""}`
                      );
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-600 px-1 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      const nextPage = currentPage + 1;
                      router.push(
                        `/app/customers?page=${nextPage}${currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : ""}`
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
