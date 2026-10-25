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

interface AppNavbarProps {
  businessName: string;
  ownerName: string;
}

export function AppNavbar({ businessName, ownerName }: AppNavbarProps) {
  const pathname = usePathname();

  const isBilling = pathname === "/app/billing";

  const navLinks = [
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

  const ownerInitial = ownerName ? ownerName.charAt(0).toUpperCase() : "O";

  return (
    <>
      {/* ─── Top Navbar (Laptop, Tablet & Desktop) in Sleek Modern Dark Slate ─ */}
      <header className="hidden md:flex items-center justify-between h-13 px-4 lg:px-6 bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 select-none shrink-0 shadow-xs">
        {/* Left: Modern Brand Mark & Shop Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/billing" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-white text-base tracking-tight">
              Bill<span className="text-blue-400">Yours</span>
            </span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Shop Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300 max-w-[200px]">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>
        </div>

        {/* Center: Clean Horizontal Navigation */}
        <nav className="flex items-center gap-1">
          {/* New Bill Button */}
          <Link
            href="/app/billing"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isBilling
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Bill</span>
          </Link>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Owner Profile & Logout */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 px-2.5 py-1 rounded-lg">
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {ownerInitial}
            </div>
            <span className="text-xs font-medium text-slate-300 truncate max-w-[120px] hidden xl:inline">
              {ownerName}
            </span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* ─── Mobile Top Header (<md) ────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between h-12 px-3 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 select-none shrink-0 shadow-xs">
        <Link href="/app/billing" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Receipt className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-white text-base tracking-tight">
            Bill<span className="text-blue-400">Yours</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium truncate max-w-[150px]">
            <Store className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
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
