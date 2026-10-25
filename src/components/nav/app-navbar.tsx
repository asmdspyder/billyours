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
      {/* ─── Top Navbar (Laptop, Tablet & Desktop) in High-Contrast Modern Blue ─ */}
      <header className="hidden md:flex items-center justify-between h-13 px-4 lg:px-6 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white border-b border-blue-800/80 sticky top-0 z-40 select-none shrink-0 shadow-md">
        {/* Left: Stylish Brand Logo & Shop Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/app/billing" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-md shadow-blue-900/20 transition-transform group-hover:scale-105">
              <Receipt className="w-4.5 h-4.5" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-white text-lg tracking-tight leading-none">
                BillYours
              </span>
            </div>
          </Link>

          <div className="h-4 w-px bg-white/20 mx-1 hidden lg:block" />

          {/* Shop Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-xs font-semibold text-blue-100 max-w-[220px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <Store className="w-3.5 h-3.5 text-blue-200 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>
        </div>

        {/* Center: Action + Navigation */}
        <div className="flex items-center gap-2">
          {/* New Bill Button */}
          <Link
            href="/app/billing"
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm ${
              isBilling
                ? "bg-white text-blue-700 shadow-md ring-2 ring-white/50"
                : "bg-blue-800/80 text-white hover:bg-white hover:text-blue-700 border border-white/20"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Bill</span>
          </Link>

          {/* Navigation links capsule */}
          <nav className="flex items-center bg-blue-800/50 p-1 rounded-xl border border-white/15">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-blue-100 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-700" : "text-blue-200"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Owner Profile & Logout */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-blue-800/60 border border-white/15 px-2.5 py-1 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-white text-blue-700 text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
              {ownerInitial}
            </div>
            <div className="min-w-0 hidden xl:block text-left">
              <p className="text-xs font-bold text-white leading-none truncate max-w-[120px]">{ownerName}</p>
              <p className="text-[10px] text-blue-200 leading-none mt-0.5">Owner</p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="px-2.5 py-1 text-blue-100 hover:text-white hover:bg-white/15 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* ─── Mobile Top Header (<md) ────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between h-12 px-3 bg-blue-600 text-white border-b border-blue-700 sticky top-0 z-40 select-none shrink-0 shadow-sm">
        <Link href="/app/billing" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-black text-white text-base tracking-tight">BillYours</span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-700/80 border border-blue-400/30 text-blue-100 text-[11px] font-semibold truncate max-w-[150px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1 text-blue-200 hover:text-white rounded-md transition-colors"
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
