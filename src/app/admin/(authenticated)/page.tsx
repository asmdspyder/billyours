import { requirePlatformAdmin } from "@/lib/auth";
import { sql } from "@/db";
import Link from "next/link";
import {
  Users,
  Store,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  Archive,
  ArrowRight,
  PlusCircle,
  ShieldAlert,
} from "lucide-react";
import { startImpersonationAction } from "@/actions/admin-actions";

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();

  // Platform-wide aggregations
  const statsResult = await sql`
    SELECT
      COUNT(id)::int as total_accounts,
      COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active_accounts,
      COUNT(CASE WHEN subscription_status = 'TRIAL' AND status = 'ACTIVE' AND trial_ends_at > NOW() THEN 1 END)::int as trial_accounts,
      COUNT(CASE WHEN (subscription_status = 'TRIAL' AND trial_ends_at <= NOW()) OR subscription_status = 'EXPIRED' THEN 1 END)::int as expired_accounts,
      COUNT(CASE WHEN status = 'SUSPENDED' THEN 1 END)::int as suspended_accounts,
      COUNT(CASE WHEN status = 'ARCHIVED' THEN 1 END)::int as archived_accounts
    FROM business_accounts;
  `;

  const stats = statsResult[0] || {};

  // Recent 6 registered accounts
  const recentAccounts = await sql`
    SELECT
      id,
      business_name,
      owner_name,
      business_email,
      business_type,
      status,
      subscription_status,
      trial_ends_at,
      created_at
    FROM business_accounts
    ORDER BY created_at DESC
    LIMIT 6;
  `;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Administrator Overview
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            Monitor tenant accounts, trial statuses, and platform health with 1-click SSO support.
          </p>
        </div>
        <Link
          href="/admin/accounts/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Business Account</span>
        </Link>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Accounts</span>
          <p className="text-2xl font-black text-slate-900">{stats.total_accounts || 0}</p>
        </div>

        {/* Active */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-green-700 uppercase">Active</span>
          <p className="text-2xl font-black text-green-700">{stats.active_accounts || 0}</p>
        </div>

        {/* Active Trials */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-blue-700 uppercase">In Trial</span>
          <p className="text-2xl font-black text-blue-600">{stats.trial_accounts || 0}</p>
        </div>

        {/* Expired Trials */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">Expired</span>
          <p className="text-2xl font-black text-amber-600">{stats.expired_accounts || 0}</p>
        </div>

        {/* Suspended */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-red-600 uppercase">Suspended</span>
          <p className="text-2xl font-black text-red-600">{stats.suspended_accounts || 0}</p>
        </div>

        {/* Archived */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Archived</span>
          <p className="text-2xl font-black text-slate-500">{stats.archived_accounts || 0}</p>
        </div>
      </div>

      {/* Recently Registered Accounts Table with 1-click SSO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">Recently Registered Businesses</h2>
          <Link
            href="/admin/accounts"
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Card List: Fits 100% width with zero horizontal scrolling */}
        <div className="sm:hidden divide-y divide-slate-100">
          {recentAccounts.map((acc: any) => (
            <div key={acc.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <Link
                    href={`/admin/accounts/${acc.id}`}
                    className="font-bold text-slate-900 text-sm hover:text-blue-600"
                  >
                    {acc.business_name}
                  </Link>
                  <div className="text-[11px] text-slate-400 capitalize">{acc.business_type} • {acc.owner_name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{acc.business_email}</div>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    acc.status === "ACTIVE"
                      ? "bg-green-50 text-green-700"
                      : acc.status === "SUSPENDED"
                      ? "bg-red-50 text-red-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {acc.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3 pt-2 border-t border-slate-50">
                <span>Sub: <strong className="text-slate-800">{acc.subscription_status}</strong></span>
                <span>Registered: {new Date(acc.created_at).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                <form action={startImpersonationAction.bind(null, acc.id)} className="flex-1">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Login (SSO)</span>
                  </button>
                </form>
                <Link
                  href={`/admin/accounts/${acc.id}`}
                  className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop & Tablet Table (sm+) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Business Name</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Trial / Subscription</th>
                <th className="px-4 py-2.5">Registered</th>
                <th className="px-4 py-2.5 text-right">SSO / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAccounts.map((acc: any) => (
                <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <Link
                      href={`/admin/accounts/${acc.id}`}
                      className="hover:text-blue-600 font-bold"
                    >
                      {acc.business_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs">
                    <div>{acc.owner_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{acc.business_email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 capitalize">
                    {acc.business_type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        acc.status === "ACTIVE"
                          ? "bg-green-50 text-green-700"
                          : acc.status === "SUSPENDED"
                          ? "bg-red-50 text-red-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {acc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <span className="font-semibold">{acc.subscription_status}</span>
                    <span className="text-[11px] text-slate-400 ml-1">
                      (until {new Date(acc.trial_ends_at).toLocaleDateString("en-IN")})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(acc.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <form action={startImpersonationAction.bind(null, acc.id)}>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                          title="Login directly into this business account via SSO"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Login (SSO)</span>
                        </button>
                      </form>
                      <Link
                        href={`/admin/accounts/${acc.id}`}
                        className="text-xs font-semibold text-blue-600 hover:underline px-2 py-1"
                      >
                        Manage
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
