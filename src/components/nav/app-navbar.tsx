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
  User,
} from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";

interface AppNavbarProps {
  businessName: string;
  ownerName: string;
}

export function AppNavbar({ businessName, ownerName }: AppNavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/app/billing", label: "New Bill", icon: PlusCircle, isPrimary: true },
    { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/bills", label: "Bills", icon: History },
    { href: "/app/items", label: "Items", icon: Package },
    { href: "/app/customers", label: "Customers", icon: Users },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  const mobileBottomLinks = [
    { href: "/app/billing", label: "New Bill", icon: PlusCircle, isPrimary: true },
    { href: "/app/dashboard", label: "Dash", icon: LayoutDashboard },
    { href: "/app/bills", label: "Bills", icon: History },
    { href: "/app/items", label: "Items", icon: Package },
    { href: "/app/customers", label: "People", icon: Users },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* ─── Top Navbar (Laptop, Tablet & Desktop) ─────────────────────────── */}
      <header className="hidden md:flex items-center justify-between h-14 px-4 lg:px-6 bg-white border-b border-slate-200/90 sticky top-0 z-40 select-none shrink-0 shadow-xs">
        {/* Left: Brand & Shop Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/billing" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Receipt className="w-4.5 h-4.5" />
            </div>
            <span className="font-black text-slate-900 text-lg tracking-tight">BillYours</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold max-w-[200px] lg:max-w-[260px] truncate">
            <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-1 lg:gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/app/billing" && pathname.startsWith(link.href));

            if (link.isPrimary) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Owner Profile & Logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-right">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[130px]">{ownerName}</p>
              <p className="text-[10px] text-slate-400 leading-tight">Owner</p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* ─── Mobile Top Header (<md) ────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between h-12 px-3 bg-white border-b border-slate-200/90 sticky top-0 z-40 select-none shrink-0">
        <Link href="/app/billing" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-black text-slate-900 text-base tracking-tight">BillYours</span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold truncate max-w-[150px]">
            <Store className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </header>

      {/* ─── Mobile Bottom Navigation (<md) ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 no-print shadow-lg">
        <div className="flex items-stretch h-14">
          {mobileBottomLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href ||
              (link.href !== "/app/billing" && pathname.startsWith(link.href));

            if (link.isPrimary) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center justify-center flex-1 relative"
                >
                  <div className="flex flex-col items-center justify-center -mt-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 mt-0.5">{link.label}</span>
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isActive ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="text-[10px] font-medium mt-0.5">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
