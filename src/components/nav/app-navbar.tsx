"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ReceiptText,
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
      <header className="hidden md:flex items-center justify-between h-16 px-5 lg:px-7 bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 select-none shrink-0 shadow-sm">
        {/* Left: Modern Brand Mark & Shop Identity */}
        <div className="flex items-center gap-3.5 shrink-0">
          <Link href="/app/billing" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <ReceiptText className="w-5 h-5" />
            </div>
            <span className="font-black text-white text-lg lg:text-xl tracking-tight">
              Bill<span className="text-blue-400">Yours</span>
            </span>
          </Link>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Shop Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300 max-w-[220px]">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>
        </div>

        {/* Center: Clean Horizontal Navigation */}
        <nav className="flex items-center gap-1.5">
          {/* New Bill Button */}
          <Link
            href="/app/billing"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
              isBilling
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Bill</span>
          </Link>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Owner Profile & Logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {ownerInitial}
            </div>
            <span className="text-xs font-medium text-slate-300 truncate max-w-[130px] hidden xl:inline">
              {ownerName}
            </span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline text-xs">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* ─── Mobile Top Header (<md) ────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between h-14 px-3.5 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 select-none shrink-0 shadow-xs">
        <Link href="/app/billing" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <ReceiptText className="w-4 h-4" />
          </div>
          <span className="font-black text-white text-base tracking-tight">
            Bill<span className="text-blue-400">Yours</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium truncate max-w-[160px]">
            <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
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
