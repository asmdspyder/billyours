"use client";

import { useTransition } from "react";
import { Phone, MessageSquare, AlertOctagon, LogOut, ShieldAlert, Store, Clock } from "lucide-react";
import { logoutAction } from "@/actions/auth-actions";

interface SubscriptionExpiredScreenProps {
  businessName: string;
  ownerName: string;
  accountId: string;
}

export function SubscriptionExpiredScreen({
  businessName,
  ownerName,
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 select-none">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Lock / Expired Badge */}
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Heading & Notice */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-red-500/15 text-red-400 border border-red-500/30 rounded-full text-xs font-black uppercase tracking-wider">
            Access Paused
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Subscription Expired
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            Your free trial or subscription period has completed. To continue creating bills and managing your shop, please contact our team for renewal.
          </p>
        </div>

        {/* Contact Numbers Box */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-5 space-y-3.5 text-left">
          <p className="text-xs font-bold text-slate-300 text-center uppercase tracking-wider">
            Call or WhatsApp for Instant Renewal
          </p>

          <div className="space-y-2.5">
            {supportNumbers.map((num) => (
              <div
                key={num.display}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-white text-sm block">
                      +91 {num.display}
                    </span>
                    <span className="text-[10px] text-slate-400">BillYours Setup & Support</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
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

          <p className="text-[11px] text-slate-400 text-center">
            Our admin team will set your new expiry date and restore instant access for your account.
          </p>
        </div>

        {/* Account Details Reference */}
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Business</span>
            <span className="font-bold text-slate-200">{businessName}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Account ID</span>
            <span className="font-mono text-slate-300">{accountId}</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{isPending ? "Signing out..." : "Sign out from this account"}</span>
        </button>
      </div>
    </div>
  );
}
