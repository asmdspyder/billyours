"use client";

import { stopImpersonationAction } from "@/actions/admin-actions";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface AdminBannerProps {
  businessName: string;
  adminEmail: string;
}

export function AdminBanner({ businessName, adminEmail }: AdminBannerProps) {
  return (
    <div className="admin-banner bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between text-sm font-medium shadow-md sticky top-0 z-50 no-print">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-slate-900" />
        <span>
          <strong>Admin Support Access:</strong> You are actively viewing <u>{businessName}</u> as platform administrator ({adminEmail}).
        </span>
      </div>
      <form action={stopImpersonationAction}>
        <button
          type="submit"
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Support Mode</span>
        </button>
      </form>
    </div>
  );
}
