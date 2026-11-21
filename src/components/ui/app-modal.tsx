"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface AppModalProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}

export function AppModal({ title, subtitle, children, onClose, size = "md" }: AppModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  const sizeClass = size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[6px] sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close popup"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className={`app-modal relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:rounded-2xl ${sizeClass}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-bold text-slate-950">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
