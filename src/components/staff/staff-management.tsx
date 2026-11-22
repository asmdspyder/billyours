"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Receipt,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  ExternalLink,
  Star,
} from "lucide-react";
import {
  StaffMemberRecord,
  StaffBillRecord,
  createStaffMemberAction,
  updateStaffMemberAction,
  deleteStaffMemberAction,
  getStaffBillsAction,
} from "@/actions/staff-actions";
import { AppLoader } from "@/components/ui/app-loader";
import { AppModal } from "@/components/ui/app-modal";
import { AppFeedbackDialog } from "@/components/ui/app-feedback-dialog";

interface StaffManagementProps {
  initialStaff: StaffMemberRecord[];
}

export function StaffManagement({ initialStaff }: StaffManagementProps) {
  const [staffList, setStaffList] = useState<StaffMemberRecord[]>(initialStaff);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMemberRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Associated bills modal
  const [activeStaffBills, setActiveStaffBills] = useState<{
    staffName: string;
    bills: StaffBillRecord[];
  } | null>(null);
  const [loadingBills, setLoadingBills] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Open Add Modal
  const openAddModal = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormIsDefault(staffList.length === 0);
    setFormError(null);
    setEditingStaff(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (staff: StaffMemberRecord) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormEmail(staff.email || "");
    setFormPhone(staff.phone || "");
    setFormIsDefault(staff.isDefault);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formName.trim().length < 2) {
      setFormError("Staff name must be at least 2 characters.");
      return;
    }
    setFormError(null);

    startTransition(async () => {
      if (editingStaff) {
        const res = await updateStaffMemberAction(editingStaff.id, {
          name: formName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          isDefault: formIsDefault,
        });
        if (res.success) {
          setIsAddModalOpen(false);
          window.location.reload();
        } else {
          setFormError(res.error || "Failed to update staff member.");
        }
      } else {
        const res = await createStaffMemberAction({
          name: formName.trim(),
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          isDefault: formIsDefault,
        });
        if (res.success) {
          setIsAddModalOpen(false);
          window.location.reload();
        } else {
          setFormError(res.error || "Failed to add staff member.");
        }
      }
    });
  };

  // Handle Delete
  const handleDelete = (staff: StaffMemberRecord) => {
    if (staffList.length <= 1) {
      setFeedbackMessage("At least one staff member is required for billing operations.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to remove "${staff.name}"? If they have billed past invoices, their records will be safely archived.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteStaffMemberAction(staff.id);
      if (res.success) {
        setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
      } else {
        setFeedbackMessage(res.error || "Failed to remove staff member.");
      }
    });
  };

  // Handle View Associated Bills
  const handleViewBills = async (staff: StaffMemberRecord) => {
    setLoadingBills(true);
    setActiveStaffBills({ staffName: staff.name, bills: [] });
    const res = await getStaffBillsAction(staff.id);
    setLoadingBills(false);
    if (res.success && res.bills) {
      setActiveStaffBills({ staffName: res.staffName || staff.name, bills: res.bills });
    } else {
      setFeedbackMessage(res.error || "Could not retrieve staff bills.");
      setActiveStaffBills(null);
    }
  };

  const totalStaffCount = staffList.length;
  const activeStaffCount = staffList.filter((s) => s.isActive).length;
  const totalBilledRevenue = staffList
    .reduce((acc, s) => acc + Number(s.totalSales || 0), 0)
    .toFixed(2);
  const totalBillsCreated = staffList.reduce((acc, s) => acc + s.totalBills, 0);

  return (
    <div className="no-scrollbar mx-auto h-full min-h-0 w-full max-w-[1360px] space-y-4 overflow-y-auto overscroll-contain px-3 py-4 pb-8 sm:px-5 md:px-6 lg:px-8 xl:px-10">
      <AppFeedbackDialog message={feedbackMessage} onClose={() => setFeedbackMessage(null)} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Staff &amp; Team</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Manage your team and see the bills attributed to each member.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 self-start rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 sm:self-auto"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add staff member
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <span className="text-xs font-medium text-slate-500">Team members</span>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{totalStaffCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <span className="text-xs font-medium text-slate-500">Active members</span>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700">{activeStaffCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <span className="text-xs font-medium text-slate-500">Bills created</span>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{totalBillsCreated}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <span className="text-xs font-medium text-slate-500">Total billed</span>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-900">₹{totalBilledRevenue}</p>
        </div>
      </div>

      <section aria-labelledby="staff-members-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="staff-members-heading" className="text-base font-semibold text-slate-900">Staff members</h2>
          <span className="text-xs text-slate-500">{totalStaffCount} total</span>
        </div>
        {staffList.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {staffList.map((staff) => {
          const initials = staff.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <div
              key={staff.id}
              className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                    {initials || "ST"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-slate-900">{staff.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {staff.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        <Star className="h-3 w-3 fill-current" />
                        Default
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      staff.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {staff.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(staff)}
                    aria-label={`Edit ${staff.name}`}
                    className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(staff)}
                    aria-label={`Remove ${staff.name}`}
                    className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                {staff.phone ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <a
                      href={`tel:${staff.phone}`}
                      className="truncate hover:text-blue-700"
                    >
                      {staff.phone}
                    </a>
                  </div>
                ) : null}
                {staff.email ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <a
                      href={`mailto:${staff.email}`}
                      className="truncate hover:text-blue-700"
                    >
                      {staff.email}
                    </a>
                  </div>
                ) : null}
                {!staff.phone && !staff.email && (
                  <p className="text-xs text-slate-400">No contact details added</p>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Bills</p>
                    <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-800">{staff.totalBills}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Billed</p>
                    <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-800">₹{staff.totalSales}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleViewBills(staff)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  View bills
                </button>
              </div>
            </div>
          );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <Users className="mx-auto h-9 w-9 text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-900">No staff members yet</h3>
            <p className="mt-1 text-sm text-slate-500">Add your first team member to start tracking bill attribution.</p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Add staff member
            </button>
          </div>
        )}
      </section>

      {/* Add / Edit Staff Modal */}
      {isAddModalOpen && (
        <AppModal
          title={editingStaff ? "Edit Staff Details" : "Add New Staff Member"}
          subtitle="Manage billing attribution and team access"
          onClose={() => setIsAddModalOpen(false)}
        >
          {formError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="app-modal space-y-5 text-sm">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Staff / Biller Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter staff member name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      Set as Default Biller
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Pre-selects this staff member automatically on the POS billing screen.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Saving..." : editingStaff ? "Update Staff" : "Add Staff"}
                </button>
              </div>
            </form>
        </AppModal>
      )}

      {/* Staff Associated Bills Drawer / Modal */}
      {activeStaffBills && (
        <div className="fixed inset-0 z-[90] flex h-[100dvh] w-screen items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  <h3 className="font-black text-base text-slate-900">
                    Bills Attributed to {activeStaffBills.staffName}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing all bills created or serviced by this staff member.
                </p>
              </div>
              <button
                onClick={() => setActiveStaffBills(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingBills ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <AppLoader size="lg" className="mb-[0.5rem] justify-center" />
                Loading associated bills...
              </div>
            ) : activeStaffBills.bills.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  No bills have been created by {activeStaffBills.staffName} yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  Select {activeStaffBills.staffName} on the POS billing screen when completing a transaction.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="w-[18%] px-4 py-3 align-middle">Bill #</th>
                        <th className="w-[16%] px-4 py-3 align-middle">Date</th>
                        <th className="w-[26%] px-4 py-3 align-middle">Customer</th>
                        <th className="w-[16%] px-4 py-3 align-middle">Payment</th>
                        <th className="w-[16%] px-4 py-3 text-right align-middle">Amount</th>
                        <th className="w-[8%] px-4 py-3 text-center align-middle">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeStaffBills.bills.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="h-12 px-4 py-3 align-middle font-mono font-bold text-slate-900">
                            {b.billNumber}
                          </td>
                          <td className="h-12 px-4 py-3 align-middle text-slate-600 whitespace-nowrap">
                            {b.completedAt}
                          </td>
                          <td className="h-12 px-4 py-3 align-middle font-medium text-slate-800">
                            {b.customerName}
                          </td>
                          <td className="h-12 px-4 py-3 align-middle">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {b.paymentMethod}
                            </span>
                          </td>
                          <td className="h-12 px-4 py-3 align-middle text-right font-extrabold text-slate-900">
                            ₹{b.grandTotal}
                          </td>
                          <td className="h-12 px-4 py-3 align-middle text-center">
                            <Link
                              href={`/app/bills/${b.id}`}
                              target="_blank"
                              className="inline-flex items-center p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              title="Open Bill"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                Total: <strong>{activeStaffBills.bills.length} bills</strong>
              </span>
              <button
                onClick={() => setActiveStaffBills(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
