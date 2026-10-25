import { requirePlatformAdmin } from "@/lib/auth";
import Link from "next/link";
import { ShieldAlert, Users, LayoutDashboard, PlusCircle, LogOut, ArrowLeft } from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";

export const metadata = {
  title: "Platform Administration — BillYours",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      {/* Admin Top Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              BY
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight">BillYours</span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                Admin Panel
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-300">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/admin/accounts"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
            >
              Business Accounts
            </Link>
            <Link
              href="/admin/accounts/new"
              className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
            >
              + Create Business
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-xs font-semibold text-white">{session.user.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{session.user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
