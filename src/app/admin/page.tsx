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
} from "lucide-react";

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();

  // Efficient platform-wide aggregations
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
            Monitor tenant accounts, trial statuses, and platform health.
          </p>
        </div>
        <Link
          href="/admin/accounts/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
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

      {/* Recently Registered Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">Recently Registered Businesses</h2>
          <Link
            href="/admin/accounts"
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>View All Accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Business Name</th>
                <th className="px-4 py-2.5">Owner</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Trial / Subscription</th>
                <th className="px-4 py-2.5">Registered</th>
                <th className="px-4 py-2.5 text-right">Action</th>
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
                    <Link
                      href={`/admin/accounts/${acc.id}`}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Manage
                    </Link>
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
