"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, Info, X } from "lucide-react";

interface AppFeedbackDialogProps {
  message: string | null;
  onClose: () => void;
  title?: string;
  variant?: "error" | "info";
}

export function AppFeedbackDialog({
  message,
  onClose,
  title,
  variant = "error",
}: AppFeedbackDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!message) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [message, onClose]);

  if (!message) return null;

  const isError = variant === "error";
  const Icon = isError ? AlertCircle : Info;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-feedback-title"
        aria-describedby="app-feedback-message"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
      >
        <div className="flex items-start gap-3 p-5">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isError ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 id="app-feedback-title" className="text-base font-bold text-slate-900">
                {title || (isError ? "Something went wrong" : "Notice")}
              </h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close message"
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p
              id="app-feedback-message"
              className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600"
            >
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className={`min-w-24 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              isError ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            OK
          </button>
        </div>
      </section>
    </div>
  );
}
