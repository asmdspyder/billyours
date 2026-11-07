"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, X } from "lucide-react";
import {
  lookupCustomerPhoneAction,
  prepareBillWhatsAppShareAction,
} from "@/actions/billing-actions";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { getWhatsAppNumber } from "@/lib/phone-utils";

interface WhatsAppBillShareProps {
  billId: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string | null;
  businessName: string;
  grandTotal: string;
  googleReviewLink?: string | null;
  className?: string;
  label?: string;
  compact?: boolean;
}

export function WhatsAppBillShare({
  billId,
  billNumber,
  customerName,
  customerPhone,
  businessName,
  grandTotal,
  googleReviewLink,
  className,
  label = "WhatsApp",
  compact = false,
}: WhatsAppBillShareProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(
    customerName === "Walk-in Customer" || customerName === "Customer" ? "" : customerName
  );
  const [phone, setPhone] = useState(customerPhone || "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "searching" | "found" | "not-found">("idle");
  const [showWebFallback, setShowWebFallback] = useState(false);
  const [webUrl, setWebUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !getWhatsAppNumber(phone)) {
      setLookupStatus("idle");
      return;
    }

    let active = true;
    setLookupStatus("searching");
    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupCustomerPhoneAction(phone);
        if (!active) return;
        if (result.found && result.customer) {
          setName(result.customer.name);
          setPhone(result.customer.phone);
          setLookupStatus("found");
        } else {
          setLookupStatus("not-found");
        }
      } catch {
        if (active) setLookupStatus("idle");
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, phone]);

  const openWhatsApp = (url: string) => {
    const parsedUrl = new URL(url);
    const number = parsedUrl.pathname.slice(1);
    const message = parsedUrl.searchParams.get("text");
    if (!number || !message) {
      setError("Could not prepare the WhatsApp message. Please try again.");
      return;
    }

    setWebUrl(
      `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(message)}`
    );
    setShowWebFallback(true);
    window.location.assign(
      `whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter the customer name.");
      return;
    }
    if (!getWhatsAppNumber(phone)) {
      setError("Enter a valid phone number with its country code.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await prepareBillWhatsAppShareAction(billId, name, phone);
      if (!result.success || !result.customerName || !result.customerPhone || !result.shareToken) {
        setError(result.error || "Could not save customer details for this bill.");
        return;
      }

      setName(result.customerName);
      setPhone(result.customerPhone);
      router.refresh();
      const shareUrl = buildWhatsAppShareUrl({
        phone: result.customerPhone,
        customerName: result.customerName,
        businessName,
        billNumber,
        grandTotal,
        shareToken: result.shareToken,
        googleReviewLink,
      });
      if (!shareUrl) {
        setError("Could not prepare a WhatsApp link for this phone number.");
        return;
      }

      setIsOpen(false);
      openWhatsApp(shareUrl);
    } catch (shareError) {
      console.error("WhatsApp bill share failed:", shareError);
      setError("Could not prepare the bill for sharing. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className || (compact
          ? "inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          : "inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 lg:w-auto lg:py-1.5")}
      >
        <Share2 className="h-3.5 w-3.5" />
        <span className="whitespace-nowrap">{label}</span>
      </button>

      {showWebFallback && webUrl && (
        <div className="fixed bottom-4 right-4 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs shadow-lg">
          <a
            href={webUrl}
            className="font-semibold text-emerald-700 underline underline-offset-2"
          >
            WhatsApp didn&apos;t open? Use WhatsApp Web
          </a>
          <button
            type="button"
            onClick={() => setShowWebFallback(false)}
            aria-label="Dismiss WhatsApp fallback"
            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) setIsOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`whatsapp-share-title-${billId}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`whatsapp-share-title-${billId}`} className="text-base font-bold text-slate-900">
                  Share bill on WhatsApp
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Bill {billNumber}: customer details are saved to this bill before sharing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor={`whatsapp-customer-phone-${billId}`} className="mb-1 block text-xs font-semibold text-slate-700">
                  WhatsApp number
                </label>
                <input
                  id={`whatsapp-customer-phone-${billId}`}
                  autoFocus
                  required
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setError(null);
                  }}
                  placeholder="Include country code, e.g. +91 or +44"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p aria-live="polite" className="mt-1 min-h-4 text-[11px] text-slate-500">
                  {lookupStatus === "searching" && "Checking saved customers…"}
                  {lookupStatus === "found" && "Saved customer found. Name filled in below."}
                  {lookupStatus === "not-found" && "New customer number. Enter their name below."}
                </p>
              </div>
              <div>
                <label htmlFor={`whatsapp-customer-name-${billId}`} className="mb-1 block text-xs font-semibold text-slate-700">
                  Customer name
                </label>
                <input
                  id={`whatsapp-customer-name-${billId}`}
                  required
                  maxLength={255}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter customer name"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
