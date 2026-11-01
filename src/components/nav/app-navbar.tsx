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
  UserCheck,
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
    { href: "/app/staff", label: "Staff", icon: UserCheck },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  const mobileBottomLinks = [
    { href: "/app/billing", label: "New Bill", icon: PlusCircle, isPrimary: true },
    { href: "/app/dashboard", label: "Dash", icon: LayoutDashboard },
    { href: "/app/bills", label: "Bills", icon: History },
    { href: "/app/items", label: "Items", icon: Package },
    { href: "/app/staff", label: "Staff", icon: UserCheck },
    { href: "/app/customers", label: "People", icon: Users },
    { href: "/app/settings", label: "Settings", icon: Settings },
  ];

  const ownerInitial = ownerName ? ownerName.charAt(0).toUpperCase() : "O";

  return (
    <>
      {/* Desktop navigation */}
      <header className="hidden xl:flex items-center justify-between h-[72px] px-5 2xl:px-7 bg-white/90 text-slate-900 border-b border-slate-200/80 sticky top-0 z-40 select-none shrink-0 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.8),0_8px_30px_rgba(15,23,42,0.035)]">
        {/* Brand and business identity */}
        <div className="flex min-w-[260px] items-center gap-3 shrink-0">
          <Link
            href="/app/billing"
            className="flex items-center gap-2.5 group"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-[13px] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_18px_rgba(37,99,235,0.24)] ring-1 ring-blue-700/10 transition-transform duration-200 group-hover:-translate-y-0.5">
              <ReceiptText className="h-[19px] w-[19px]" strokeWidth={2.2} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-cyan-400" />
            </div>
            <span className="text-[20px] font-black tracking-[-0.045em] text-slate-950">
              Bill<span className="text-blue-600">Yours</span>
            </span>
          </Link>

          <div className="hidden 2xl:flex h-8 max-w-[190px] items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 text-xs font-semibold text-slate-600">
            <Store className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="truncate">{businessName}</span>
          </div>
        </div>

        {/* Navigation rail */}
        <nav aria-label="Primary" className="absolute left-1/2 flex -translate-x-1/2 items-center rounded-[14px] border border-slate-200/70 bg-slate-50/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <Link
            href="/app/billing"
            className={`inline-flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-xs font-bold transition-all duration-200 ${
              isBilling
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.24)]"
                : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
            }`}
          >
            <PlusCircle className="h-4 w-4" strokeWidth={2.2} />
            <span>New Bill</span>
          </Link>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-blue-700 shadow-[0_2px_10px_rgba(15,23,42,0.08),inset_0_0_0_1px_rgba(37,99,235,0.08)]"
                    : "text-slate-500 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} strokeWidth={isActive ? 2.3 : 2} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile and sign out */}
        <div className="flex min-w-[260px] items-center justify-end gap-2 shrink-0">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-[0_3px_14px_rgba(15,23,42,0.05)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-xs font-bold text-white ring-2 ring-white shadow-sm">
              {ownerInitial}
            </div>
            <div className="hidden 2xl:block min-w-0">
              <p className="max-w-[110px] truncate text-xs font-bold leading-tight text-slate-800">{ownerName}</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">Owner</p>
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Tablet navigation */}
      <header className="hidden md:flex xl:hidden h-[106px] shrink-0 flex-col justify-center gap-2 border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl shadow-[0_5px_24px_rgba(15,23,42,0.025)]">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <Link href="/app/billing" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_6px_14px_rgba(37,99,235,0.18)]"><ReceiptText className="h-[18px] w-[18px]" /></span>
            <span className="truncate text-lg font-black tracking-tight text-slate-950">Bill<span className="text-blue-600">Yours</span></span>
            <span className="hidden lg:inline-flex h-8 max-w-[180px] items-center gap-1.5 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600"><Store className="h-3.5 w-3.5 shrink-0 text-blue-500" />{businessName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden lg:block max-w-[120px] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{ownerName}</span>
            <form action={logoutAction}>
              <button type="submit" title="Sign out" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600"><LogOut className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
        <nav aria-label="Primary" className="flex min-w-0 items-center gap-1 overflow-x-auto thin-scroll">
          {[{ href: "/app/billing", label: "New Bill", icon: PlusCircle }, ...navLinks].map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><Icon className={`h-4 w-4 ${active ? "text-blue-600" : "text-slate-500"}`} />{link.label}</Link>;
          })}
        </nav>
      </header>

      {/* Mobile top header */}
      <header className="md:hidden flex h-[62px] items-center justify-between px-3.5 bg-white/90 text-slate-900 border-b border-slate-200/80 sticky top-0 z-40 select-none shrink-0 backdrop-blur-xl shadow-[0_5px_20px_rgba(15,23,42,0.025)]">
        <Link href="/app/billing" className="flex items-center gap-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_6px_14px_rgba(37,99,235,0.2)]">
            <ReceiptText className="h-[18px] w-[18px]" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-cyan-400" />
          </div>
          <span className="text-[17px] font-black tracking-[-0.035em] text-slate-950">
            Bill<span className="text-blue-600">Yours</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-600 text-[10px] font-semibold truncate max-w-[112px]">
            <Store className="w-3 h-3 text-blue-500 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* ─── Mobile Bottom Navigation (<md) ─────────────────────────────────── */}
      <nav aria-label="Primary" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 no-print shadow-[0_-6px_24px_rgba(10,14,26,0.06)]">
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
                  aria-label="New Bill"
                  className="flex min-w-0 flex-1 flex-col items-center justify-center relative"
                >
                  <div className="flex flex-col items-center justify-center -mt-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="max-w-full truncate text-[9px] font-bold text-blue-700 mt-0.5">New</span>
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 transition-colors ${
                  isActive ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium mt-0.5">{link.label === "Dashboard" ? "Home" : link.label === "Customers" ? "People" : link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
