"use client";

import { Printer } from "lucide-react";

export function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
    >
      <Printer className="w-4 h-4" />
      <span>Print or Save Receipt</span>
    </button>
  );
}
