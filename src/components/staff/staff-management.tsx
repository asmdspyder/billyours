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
  IndianRupee,
  Shield,
  Star,
  Search,
} from "lucide-react";
import {
  StaffMemberRecord,
  StaffBillRecord,
  createStaffMemberAction,
  updateStaffMemberAction,
  deleteStaffMemberAction,
  getStaffBillsAction,
} from "@/actions/staff-actions";

interface StaffManagementProps {
  initialStaff: StaffMemberRecord[];
}

export function StaffManagement({ initialStaff }: StaffManagementProps) {
  const [staffList, setStaffList] = useState<StaffMemberRecord[]>(initialStaff);
  const [searchQuery, setSearchQuery] = useState("");
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
      alert("At least one staff member is required for billing operations.");
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
        alert(res.error || "Failed to remove staff member.");
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
      alert(res.error || "Could not retrieve staff bills.");
      setActiveStaffBills(null);
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.phone && s.phone.includes(searchQuery))
  );

  const totalStaffCount = staffList.length;
  const activeStaffCount = staffList.filter((s) => s.isActive).length;
  const totalBilledRevenue = staffList
    .reduce((acc, s) => acc + Number(s.totalSales || 0), 0)
    .toFixed(2);
  const totalBillsCreated = staffList.reduce((acc, s) => acc + s.totalBills, 0);

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">Staff & Team</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500">
            Manage your service staff, assign bill attribution, and track sales performance per staff member.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Staff
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalStaffCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Staff
          </span>
          <p className="text-2xl font-black text-green-600 mt-1">{activeStaffCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Attributed Bills
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">{totalBillsCreated}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Staff Sales Volume
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">₹{totalBilledRevenue}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2.5">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search staff by name, email, or phone number..."
          className="w-full text-xs md:text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => {
          const initials = staff.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <div
              key={staff.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md ${
                staff.isDefault ? "border-blue-400/80 bg-blue-50/20" : "border-slate-200/80"
              }`}
            >
              {/* Header: Avatar, Name, Default Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-xs ${
                      staff.isDefault
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600"
                        : "bg-gradient-to-br from-slate-600 to-slate-800"
                    }`}
                  >
                    {initials || "ST"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight">
                        {staff.name}
                      </h3>
                      {staff.isDefault && (
                        <span className="inline-flex items-center gap-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Star className="w-2.5 h-2.5 fill-blue-600" />
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">Added: {staff.createdAt}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(staff)}
                    title="Edit Staff"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(staff)}
                    title="Remove Staff"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-1.5 text-xs text-slate-600 border-t border-b border-slate-100 py-3">
                {staff.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${staff.phone}`}
                      className="hover:text-blue-600 hover:underline font-mono"
                    >
                      {staff.phone}
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>No phone number provided</span>
                  </div>
                )}

                {staff.email ? (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${staff.email}`}
                      className="hover:text-blue-600 hover:underline truncate"
                    >
                      {staff.email}
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>No email provided</span>
                  </div>
                )}
              </div>

              {/* Aggregated Bill Performance */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Total Bills
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">{staff.totalBills}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Total Billed
                  </span>
                  <p className="font-extrabold text-blue-600 text-sm">₹{staff.totalSales}</p>
                </div>
              </div>

              {/* View Associated Bills CTA */}
              <button
                onClick={() => handleViewBills(staff)}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>View {staff.totalBills} Associated Bills</span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No staff members found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No staff match "${searchQuery}". Try searching with another term.`
              : "Get started by adding your first staff member or cashier."}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Staff</span>
          </button>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base text-slate-900">
                  {editingStaff ? "Edit Staff Details" : "Add New Staff Member"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs md:text-sm">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Staff / Biller Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma or Priya Verma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
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
          </div>
        </div>
      )}

      {/* Staff Associated Bills Drawer / Modal */}
      {activeStaffBills && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
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
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
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
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Bill #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Payment</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeStaffBills.bills.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {b.billNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {b.completedAt}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {b.customerName}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {b.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                            ₹{b.grandTotal}
                          </td>
                          <td className="py-2.5 px-3 text-center">
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
