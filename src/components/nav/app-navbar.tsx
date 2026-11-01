"use client";

import { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";

interface AppNavbarProps {
  businessName: string;
  ownerName: string;
}

export function AppNavbar({ businessName, ownerName }: AppNavbarProps) {
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

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
      {/* ─── Top Glow Progress Bar when transitioning routes ───────────────── */}
      {navigatingTo && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-blue-100 overflow-hidden">
          <div className="h-full bg-white/70 w-1/2 animate-loading-bar rounded-full" />
        </div>
      )}

      {/* Desktop navigation */}
      <header className="hidden xl:flex items-center justify-between h-16 px-5 2xl:px-8 bg-white/95 text-slate-900 border-b border-slate-200 sticky top-0 z-40 select-none shrink-0 backdrop-blur-md">
        {/* Left: Modern Brand Mark & Shop Identity */}
        <div className="flex items-center gap-3.5 shrink-0">
          <Link
            href="/app/billing"
            onClick={() => {
              if (pathname !== "/app/billing") setNavigatingTo("/app/billing");
            }}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <ReceiptText className="w-5 h-5" />
            </div>
            <span className="font-black text-slate-900 text-lg lg:text-xl tracking-tight">
              Bill<span className="text-blue-600">Yours</span>
            </span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden 2xl:block" />

          {/* Shop Indicator */}
          <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#faf7f0] border border-slate-200 text-xs font-medium text-slate-600 max-w-[220px]">
            <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>
        </div>

        {/* Center: Clean Horizontal Navigation */}
        <nav className="flex items-center gap-1 lg:gap-1.5">
          {/* New Bill Button */}
          <Link
            href="/app/billing"
            onClick={() => {
              if (pathname !== "/app/billing") setNavigatingTo("/app/billing");
            }}
            className={`inline-flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-bold transition-colors ${
              isBilling
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {navigatingTo === "/app/billing" ? (
              <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin text-white" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            )}
            <span>New Bill</span>
          </Link>

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));
            const isNavigatingThis = navigatingTo === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  if (pathname !== link.href) setNavigatingTo(link.href);
                }}
                className={`inline-flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {isNavigatingThis ? (
                  <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin text-blue-400" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                )}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Owner Profile & Logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 bg-[#faf7f0] border border-slate-200 px-3 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
              {ownerInitial}
            </div>
            <span className="text-xs font-medium text-slate-700 truncate max-w-[130px] hidden 2xl:inline">
              {ownerName}
            </span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline text-xs">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Tablet navigation */}
      <header className="hidden md:flex xl:hidden h-[106px] shrink-0 flex-col justify-center gap-2 border-b border-slate-200 bg-white/95 px-5 backdrop-blur-md">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <Link href="/app/billing" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-blue-600 text-white"><ReceiptText className="h-4 w-4" /></span>
            <span className="truncate font-extrabold text-slate-900">Bill<span className="text-blue-600">Yours</span></span>
            <span className="hidden lg:inline-flex max-w-[180px] items-center gap-1.5 truncate rounded-md border border-slate-200 bg-[#faf7f0] px-2.5 py-1 text-xs text-slate-600"><Store className="h-3.5 w-3.5 shrink-0" />{businessName}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden lg:block max-w-[120px] truncate text-xs text-slate-600">{ownerName}</span>
            <form action={logoutAction}>
              <button type="submit" title="Sign out" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"><LogOut className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
        <nav aria-label="Primary" className="flex min-w-0 items-center gap-1 overflow-x-auto thin-scroll">
          {[{ href: "/app/billing", label: "New Bill", icon: PlusCircle }, ...navLinks].map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || (link.href !== "/app/billing" && pathname.startsWith(link.href));
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} onClick={() => pathname !== link.href && setNavigatingTo(link.href)} className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}><Icon className={`h-4 w-4 ${active ? "text-blue-600" : "text-slate-500"}`} />{link.label}</Link>;
          })}
        </nav>
      </header>

      {/* Mobile top header */}
      <header className="md:hidden flex items-center justify-between h-14 px-3.5 bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40 select-none shrink-0">
        <Link href="/app/billing" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <ReceiptText className="w-4 h-4" />
          </div>
          <span className="font-black text-slate-900 text-base tracking-tight">
            Bill<span className="text-blue-600">Yours</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#faf7f0] border border-slate-200 text-slate-600 text-xs font-medium truncate max-w-[160px]">
            <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{businessName}</span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-2 text-slate-500 hover:text-red-600 rounded-md transition-colors"
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

            const isNavigatingThis = navigatingTo === link.href;

            if (link.isPrimary) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    if (pathname !== link.href) setNavigatingTo(link.href);
                  }}
                  aria-label="New Bill"
                  className="flex min-w-0 flex-1 flex-col items-center justify-center relative"
                >
                  <div className="flex flex-col items-center justify-center -mt-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
                      {isNavigatingThis ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
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
                onClick={() => {
                  if (pathname !== link.href) setNavigatingTo(link.href);
                }}
                aria-label={link.label}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center py-1 transition-colors ${
                  isActive ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                {isNavigatingThis ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin text-blue-600" />
                ) : (
                  <Icon className="w-4.5 h-4.5" />
                )}
                <span className="max-w-full truncate px-0.5 text-[9px] font-medium mt-0.5">{link.label === "Dashboard" ? "Home" : link.label === "Customers" ? "People" : link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
