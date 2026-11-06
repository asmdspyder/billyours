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

const NAV_LINKS = [
  { href: "/app/billing", label: "New Bill", shortLabel: "New", icon: PlusCircle },
  { href: "/app/dashboard", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/app/bills", label: "Bills", shortLabel: "Bills", icon: History },
  { href: "/app/items", label: "Items", shortLabel: "Items", icon: Package },
  { href: "/app/customers", label: "Customers", shortLabel: "People", icon: Users },
  { href: "/app/staff", label: "Staff", shortLabel: "Staff", icon: UserCheck },
  { href: "/app/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

export function AppNavbar({ businessName, ownerName }: AppNavbarProps) {
  const pathname = usePathname();
  const ownerInitial = ownerName ? ownerName.charAt(0).toUpperCase() : "O";

  const isActive = (href: string) =>
    pathname === href || (href !== "/app/billing" && pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 hidden h-[60px] shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/95 px-3 text-slate-900 backdrop-blur-md md:flex lg:gap-6 lg:px-4 xl:px-5">
        <Link href="/app/billing" aria-label="BillYours home" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-600 text-white shadow-sm">
            <ReceiptText className="h-[17px] w-[17px]" aria-hidden="true" />
          </span>
          <span className="text-[17px] font-black tracking-tight text-slate-950">
            Bill<span className="text-blue-600">Yours</span>
          </span>
        </Link>

        <span className="hidden min-w-0 max-w-[190px] shrink items-center gap-1.5 truncate rounded-md border border-slate-200 bg-[#faf7f0] px-2.5 py-1.5 text-xs font-medium text-slate-600 lg:flex 2xl:max-w-[220px]">
          <Store className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
          <span className="truncate" title={businessName}>{businessName}</span>
        </span>

        <nav aria-label="Primary" className="flex min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto overscroll-x-contain px-1 no-scrollbar 2xl:justify-center">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                aria-label={link.label}
                title={link.label}
                className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors xl:px-2.5 2xl:px-3 ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} aria-hidden="true" />
                <span className="hidden md:inline xl:hidden">{link.shortLabel}</span>
                <span className="hidden xl:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-50 text-sm font-bold text-blue-700" title={ownerName}>
            {ownerInitial}
          </div>
          <span className="hidden max-w-[150px] truncate text-xs font-semibold text-slate-700 2xl:inline" title={ownerName}>
            {ownerName}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </header>

      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white/95 px-3 text-slate-900 backdrop-blur-md md:hidden">
        <Link href="/app/billing" aria-label="BillYours home" className="flex shrink-0 items-center gap-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-blue-600 text-white shadow-sm">
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-[16px] font-black tracking-tight text-slate-950">
            Bill<span className="text-blue-600">Yours</span>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <div className="inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-[#faf7f0] px-2 py-1.5 text-xs font-semibold text-slate-700 sm:px-2.5">
            <Store className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
            <span className="truncate max-w-[calc(100vw-190px)]" title={businessName}>{businessName}</span>
          </div>
          <form action={logoutAction} className="shrink-0">
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </header>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(10,14,26,0.06)] backdrop-blur-md md:hidden no-print">
        <div className="flex h-14 items-stretch px-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            const isNewBill = link.href === "/app/billing";

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                aria-label={link.label}
                title={link.label}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-semibold transition-colors ${
                  active ? "text-blue-700" : "text-slate-500 hover:text-blue-700"
                }`}
              >
                <span className={`flex h-7 w-8 items-center justify-center rounded-lg ${
                  active || isNewBill ? "bg-blue-600 text-white" : "text-slate-500"
                }`}>
                  <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                </span>
                <span className="max-w-full truncate leading-none">{link.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
