"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Search, Plus, Phone, Eye, X, AlertCircle } from "lucide-react";
import { createCustomerAction } from "@/actions/customer-actions";
import { DataTable } from "@/components/ui/data-table";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (term: string) => {
    if (term.trim()) {
      router.push(`/app/customers?search=${encodeURIComponent(term.trim())}`);
    } else {
      router.push("/app/customers");
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
      <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or phone number..."
            defaultValue={currentSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch((e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                minWidth="min-w-[850px]"
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
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. customer@example.com"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Special preferences, allergies, or notes..."
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
          </div>
        </div>
      )}
    </div>
  );
}
