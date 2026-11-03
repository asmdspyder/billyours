"use client";

import { useTransition } from "react";
import { Phone, MessageSquare, AlertOctagon, LogOut, ShieldAlert, Store, Clock } from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";

interface SubscriptionExpiredScreenProps {
  businessName: string;
  ownerName?: string;
  accountId: string;
}

export function SubscriptionExpiredScreen({
  businessName,
  ownerName = "Owner",
  accountId,
}: SubscriptionExpiredScreenProps) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const supportNumbers = [
    { display: "7904561269", tel: "+917904561269", wa: "917904561269" },
    { display: "7845418030", tel: "+917845418030", wa: "917845418030" },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Lock / Expired Badge */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        {/* Heading & Notice */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-bold uppercase tracking-wider">
            Access Paused
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Subscription Expired
          </h1>
          <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            Your free trial or subscription period has completed. To continue creating bills and managing your shop, please contact our team for renewal.
          </p>
        </div>

        {/* Contact Numbers Box */}
        <div className="bg-[#faf7f0] border border-slate-200 rounded-xl p-5 space-y-3.5 text-left">
          <p className="text-xs font-bold text-slate-600 text-center uppercase tracking-wider">
            Call or WhatsApp for Instant Renewal
          </p>

          <div className="space-y-2.5">
            {supportNumbers.map((num) => (
              <div
                key={num.display}
                className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-slate-900 text-sm block">
                      +91 {num.display}
                    </span>
                    <span className="text-[10px] text-slate-500">BillYours Setup & Support</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <a
                    href={`tel:${num.tel}`}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${num.wa}?text=${encodeURIComponent(
                      `Hello, I would like to renew the subscription for my business "${businessName}" (Account: ${accountId}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Our admin team will set your new expiry date and restore instant access for your account.
          </p>
        </div>

        {/* Account Details Reference */}
        <div className="bg-white rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Business</span>
            <span className="font-bold text-slate-800 break-words">{businessName}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Account ID</span>
            <span className="font-mono text-slate-700 break-all">{accountId}</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer py-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isPending ? "Signing out..." : "Sign out from this account"}</span>
        </button>
      </div>
    </div>
  );
}
