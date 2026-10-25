"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Store,
  ExternalLink,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Archive,
  Clock,
  Receipt,
  Users,
  Package,
} from "lucide-react";
import {
  startImpersonationAction,
  updateAccountStatusAction,
  updateAccountSubscriptionAction,
} from "@/actions/admin-actions";

interface AccountDetails {
  id: string;
  businessName: string;
  ownerName: string;
  businessEmail: string;
  businessPhone?: string | null;
  address?: string | null;
  state?: string | null;
  businessType: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  subscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED";
  subscriptionPlan?: string | null;
  trialEndsAt: string;
  subscriptionEndsAt?: string | null;
  createdAt: string;
  archivedAt?: string | null;
}

interface AccountStats {
  totalBills: number;
  totalSales: string;
  totalCustomers: number;
  totalItems: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  details: string | null;
  adminName: string;
  createdAt: string;
}

interface AccountManagementViewProps {
  account: AccountDetails;
  stats: AccountStats;
  auditLogs: AuditLogEntry[];
}

export function AccountManagementView({
  account,
  stats,
  auditLogs,
}: AccountManagementViewProps) {
  const [isPending, startTransition] = useTransition();
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleStatusChange = (newStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED") => {
    if (
      !confirm(
        `Are you sure you want to change this account's status to ${newStatus}?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await updateAccountStatusAction(account.id, newStatus);
      if (res.success) {
        setFeedbackMsg(`Account status updated to ${newStatus}.`);
        window.location.reload();
      } else {
        alert(res.error || "Failed to update status.");
      }
    });
  };

  const handleExtendTrial = (days: number) => {
    const currentEnd = new Date(account.trialEndsAt);
    const base = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    startTransition(async () => {
      const res = await updateAccountSubscriptionAction(account.id, {
        subscriptionStatus: "TRIAL",
        trialEndsAt: newEnd.toISOString(),
      });
      if (res.success) {
        setFeedbackMsg(`Trial extended by ${days} days.`);
        window.location.reload();
      } else {
        alert(res.error || "Failed to extend trial.");
      }
    });
  };

  const handleActivateSubscription = (plan: "MONTHLY" | "YEARLY") => {
    const days = plan === "MONTHLY" ? 30 : 365;
    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    startTransition(async () => {
      const res = await updateAccountSubscriptionAction(account.id, {
        subscriptionStatus: "ACTIVE",
        subscriptionPlan: plan,
        subscriptionEndsAt: endsAt,
      });
      if (res.success) {
        setFeedbackMsg(`Activated ${plan} plan for 1 ${plan === "MONTHLY" ? "month" : "year"}.`);
        window.location.reload();
      } else {
        alert(res.error || "Failed to activate subscription.");
      }
    });
  };

  const handleImpersonate = () => {
    if (
      !confirm(
        `Open "${account.businessName}" in audited support mode? You will view the account as the owner.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      await startImpersonationAction(account.id);
    });
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/accounts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Accounts</span>
        </Link>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900">{account.businessName}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                account.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : account.status === "SUSPENDED"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {account.status}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              {account.subscriptionStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Owner: <strong>{account.ownerName}</strong> ({account.businessEmail}) • Phone:{" "}
            {account.businessPhone || "None"} • Registered on {account.createdAt}
          </p>
        </div>

        {/* Audited Impersonation Action */}
        <div>
          <button
            onClick={handleImpersonate}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Open Account (Support Mode)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Business Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Total Sales</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-blue-600 mt-1">₹{stats.totalSales}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Completed Bills</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{stats.totalBills}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Active Customers</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{stats.totalCustomers}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Catalog Items</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1">{stats.totalItems}</p>
        </div>
      </div>

      {/* Management Controls: Subscription & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Management Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-900">Subscription & Trial Management</h2>
          </div>

          <div className="text-xs space-y-1 text-slate-600">
            <p>
              <strong>Status:</strong> {account.subscriptionStatus}
            </p>
            <p>
              <strong>Trial Ends:</strong> {new Date(account.trialEndsAt).toLocaleString("en-IN")}
            </p>
            {account.subscriptionEndsAt && (
              <p>
                <strong>Subscription Ends:</strong>{" "}
                {new Date(account.subscriptionEndsAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Quick Trial Adjustments
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleExtendTrial(7)}
                disabled={isPending}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors"
              >
                + Extend Trial (7 Days)
              </button>
              <button
                onClick={() => handleExtendTrial(30)}
                disabled={isPending}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors"
              >
                + Extend Trial (30 Days)
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Activate Paid Plans (Manual)
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleActivateSubscription("MONTHLY")}
                disabled={isPending}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
              >
                Activate Monthly (₹299/mo)
              </button>
              <button
                onClick={() => handleActivateSubscription("YEARLY")}
                disabled={isPending}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
              >
                Activate Yearly (₹2,999/yr)
              </button>
            </div>
          </div>
        </div>

        {/* Account Status Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-900">Account Access & Lifecycle</h2>
          </div>

          <p className="text-xs text-slate-600">
            Controlling account status overrides trial and subscription states. Suspended accounts cannot create bills or modify data.
          </p>

          <div className="space-y-2 pt-2">
            {account.status !== "ACTIVE" && (
              <button
                onClick={() => handleStatusChange("ACTIVE")}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Reactivate / Activate Account</span>
              </button>
            )}

            {account.status === "ACTIVE" && (
              <button
                onClick={() => handleStatusChange("SUSPENDED")}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                <Ban className="w-4 h-4" />
                <span>Suspend Account</span>
              </button>
            )}

            {account.status !== "ARCHIVED" && (
              <button
                onClick={() => handleStatusChange("ARCHIVED")}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 font-semibold text-xs rounded-lg transition-colors border border-slate-200"
              >
                <Archive className="w-4 h-4" />
                <span>Archive Account (Soft Delete)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-sm text-slate-900">Administrator Audit Trail</h2>
          <p className="text-xs text-slate-400">
            Chronological audit log of administrator actions on this tenant.
          </p>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No admin actions logged yet for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Details</th>
                  <th className="px-4 py-2.5">Admin Actor</th>
                  <th className="px-4 py-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{log.action}</td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">
                      {log.details || "—"}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{log.adminName}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400 whitespace-nowrap">
                      {log.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
