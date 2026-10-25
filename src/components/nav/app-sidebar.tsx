"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Receipt,
  PlusCircle,
  Package,
  History,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Store,
  ChevronRight,
} from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";

interface AppSidebarProps {
  businessName: string;
  ownerName: string;
}

export function AppSidebar({ businessName, ownerName }: AppSidebarProps) {
  const pathname = usePathname();

  const links = [
    { href: "/app/billing", label: "New Bill", icon: PlusCircle, highlight: true },
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/bills", label: "Bills", icon: History },
    { href: "/app/items", label: "Items", icon: Package },
    { href: "/app/customers", label: "Customers", icon: Users },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  const bottomLinks = [
    { href: "/app/billing", label: "Bill", icon: PlusCircle, highlight: true },
    { href: "/app/dashboard", label: "Dash", icon: LayoutDashboard },
    { href: "/app/bills", label: "Bills", icon: History },
    { href: "/app/items", label: "Items", icon: Package },
    { href: "/app/customers", label: "People", icon: Users },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* ─── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-slate-200 bg-white h-screen sticky top-0 no-print select-none shrink-0">
        {/* Brand */}
        <div className="px-4 pt-5 pb-4 border-b border-slate-100">
          <Link href="/app/billing" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-900 text-base tracking-tight leading-none">BillYours</p>
              <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                <Store className="w-3 h-3 shrink-0" />
                <span className="truncate">{businessName}</span>
              </p>
            </div>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/app/billing" && pathname.startsWith(link.href));

            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all mb-1 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-slate-700" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{ownerName}</p>
              <p className="text-xs text-slate-400">Owner</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Bottom Navigation ─────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 no-print">
        <div className="flex items-stretch h-16">
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/app/billing" && pathname.startsWith(link.href));

            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center justify-center flex-1 gap-0.5 relative"
                >
                  <div
                    className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                      isActive ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                      isActive ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
                    } -mt-3`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600">{link.label}</span>
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center flex-1 gap-0.5 py-1 transition-colors ${
                  isActive ? "text-blue-600" : "text-slate-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
