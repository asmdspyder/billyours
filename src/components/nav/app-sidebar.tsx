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
    { href: "/app/items", label: "Items", icon: Package },
    { href: "/app/bills", label: "Bills", icon: History },
    { href: "/app/customers", label: "Customers", icon: Users },
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white h-screen sticky top-0 no-print select-none">
        {/* Brand & Business */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <Link href="/app/billing" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">BillYours</span>
              <div className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-[140px]">
                <Store className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{businessName}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));

            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors mb-2 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 text-blue-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer with Owner Profile & Logout */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-slate-900 truncate">{ownerName}</p>
              <p className="text-[11px] text-slate-500 truncate">Owner</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out"
                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center justify-around py-2 px-1 no-print shadow-lg">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));

          if (link.highlight) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-blue-600 mt-1">New Bill</span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                isActive ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
