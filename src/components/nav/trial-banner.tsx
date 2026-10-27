"use client";

import { AlertTriangle, Clock } from "lucide-react";

interface TrialBannerProps {
  status: "TRIAL" | "ACTIVE" | "EXPIRED";
  daysRemaining: number;
  isExpired: boolean;
}

export function TrialBanner({ status, daysRemaining, isExpired }: TrialBannerProps) {
  if (status === "ACTIVE" && !isExpired) {
    return null; // Normal active subscription, no banner needed
  }

  if (isExpired) {
    return (
      <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>
            <strong>Trial Expired:</strong> Your account is currently in read-only mode. Historical bills and customer records are safely preserved. New bill creation is paused.
          </span>
        </div>
        <span className="text-red-700 underline font-semibold text-xs">
          Contact admin for activation
        </span>
      </div>
    );
  }

  // User requested: "I no need that free trial message showing once logged in account"
  if (status === "TRIAL") {
    return null;
  }

  return null;
}
