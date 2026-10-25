import { requirePlatformAdmin } from "@/lib/auth";
import { sql } from "@/db";
import Link from "next/link";
import { Search, Plus, Store, ArrowRight } from "lucide-react";

interface AdminAccountsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    subStatus?: string;
  }>;
}

export default async function AdminAccountsPage(props: AdminAccountsPageProps) {
  await requirePlatformAdmin();
  const searchParams = await props.searchParams;

  const search = searchParams.search?.trim() || "";
  const status = searchParams.status || "ALL";
  const subStatus = searchParams.subStatus || "ALL";

  const searchPattern = `%${search}%`;

  const accounts = await sql`
    SELECT
      id,
      business_name,
      owner_name,
      business_email,
      business_phone,
      business_type,
      status,
      subscription_status,
      subscription_plan,
      trial_starts_at,
      trial_ends_at,
      subscription_starts_at,
      subscription_ends_at,
      created_at
    FROM business_accounts
    WHERE (${search === ""} OR business_name ILIKE ${searchPattern} OR owner_name ILIKE ${searchPattern} OR business_email ILIKE ${searchPattern})
      AND (${status === "ALL"} OR status = ${status})
      AND (${subStatus === "ALL"} OR subscription_status = ${subStatus})
    ORDER BY created_at DESC;
  `;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Business Accounts</h1>
          <p className="text-xs md:text-sm text-slate-500">
            All tenant businesses registered on BillYours ({accounts.length} found).
          </p>
        </div>
        <Link
          href="/admin/accounts/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Account</span>
        </Link>
      </div>

      {/* Accounts List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Owner Contact</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Trial Expiry</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc: any) => (
                <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/accounts/${acc.id}`}
                      className="font-bold text-slate-900 hover:text-blue-600"
                    >
                      {acc.business_name}
                    </Link>
                    <div className="text-[11px] text-slate-400 capitalize">{acc.business_type}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-semibold text-slate-800">{acc.owner_name}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{acc.business_email}</div>
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
                  <td className="px-4 py-3 text-xs">
                    <span className="font-semibold text-slate-800">{acc.subscription_status}</span>
                    {acc.subscription_plan && (
                      <span className="text-[11px] text-slate-400 ml-1">({acc.subscription_plan})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                    {new Date(acc.trial_ends_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(acc.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/accounts/${acc.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
