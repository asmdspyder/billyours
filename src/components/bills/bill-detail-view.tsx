"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Printer,
  Copy,
  Check,
  Ban,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  FileText,
  AlertTriangle,
  ReceiptText,
  PlusCircle,
  X,
  MapPin,
  Building2,
  Table as TableIcon,
  Globe,
} from "lucide-react";
import { getBillShareUrl } from "@/lib/base-url";
import { cancelBillAction } from "@/actions/billing-actions";
import { WhatsAppBillShare } from "@/components/bills/whatsapp-bill-share";
import { AppFeedbackDialog } from "@/components/ui/app-feedback-dialog";

export function InstagramLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Instagram"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export function FacebookLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Facebook"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface BillItem {
  id: string;
  name: string;
  unitPrice: string;
  quantity: number;
  lineSubtotal: string;
  hsnSacCode?: string | null;
  taxTreatment?: string | null;
  priceType?: string | null;
  gstRate?: string | null;
  taxableAmount?: string | null;
  cgstRate?: string | null;
  cgstAmount?: string | null;
  sgstRate?: string | null;
  sgstAmount?: string | null;
  igstRate?: string | null;
  igstAmount?: string | null;
  totalTax?: string | null;
  lineTotal?: string | null;
}

interface BillData {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string | null;
  customerGstin?: string | null;
  customerState?: string | null;
  placeOfSupplyState?: string | null;
  isInterState?: boolean;
  subtotal: string;
  discountType: "FIXED" | "PERCENTAGE" | null;
  discountValue: string;
  discountAmount: string;
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: string;
  taxInclusive: boolean;
  taxableAmount: string;
  taxAmount: string;
  totalCgst?: string;
  totalSgst?: string;
  totalIgst?: string;
  totalTax?: string;
  roundOff?: string;
  grandTotal: string;
  paymentStatus: "PAID" | "UNPAID";
  paymentMethod: string;
  amountPaid: string;
  status: "COMPLETED" | "CANCELLED";
  notes?: string | null;
  completedAt: string;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdByName: string;
  staffId?: string | null;
  staffNameSnapshot?: string | null;
}

interface BillDetailViewProps {
  business: {
    id: string;
    businessName: string;
    ownerName: string;
    businessPhone?: string | null;
    businessEmail?: string | null;
    address?: string | null;
    state?: string | null;
    currency: string;
    gstin?: string | null;
    gstRegistrationType?: string | null;
    fssai?: string | null;
    website?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    googleReviewLink?: string | null;
  };
  bill: BillData;
  items: BillItem[];
  shareToken: string;
  initialAutoPrint?: boolean;
  initialFormat?: string;
  showHistoryBack?: boolean;
}

export function BillDetailView({
  business,
  bill,
  items,
  shareToken,
  initialAutoPrint,
  initialFormat = "thermal",
  showHistoryBack = false,
}: BillDetailViewProps) {
  const [printFormat, setPrintFormat] = useState<"thermal" | "a4">(
    initialFormat === "a4" ? "a4" : "thermal"
  );
  const [copied, setCopied] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Auto trigger print if query param was present
  useEffect(() => {
    if (initialAutoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialAutoPrint]);

  // Construct WhatsApp & Share URLs
  const shareUrl = getBillShareUrl(shareToken);
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedbackMessage(`Share Link:\n${shareUrl}`);
    }
  };

  const handleCancelBill = () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      setCancelError("Please enter a cancellation reason (min 3 chars).");
      return;
    }
    setCancelError(null);

    startTransition(async () => {
      const res = await cancelBillAction(bill.id, cancelReason);
      if (res.success) {
        setShowCancelModal(false);
        window.location.reload();
      } else {
        setCancelError(res.error || "Failed to cancel bill.");
      }
    });
  };

  const isComposition = business.gstRegistrationType === "COMPOSITION";
  const hasItemLevelGst = items.some(
    (it) => it.gstRate !== null && it.gstRate !== undefined
  );

  // Group items by GST Rate for the Consolidated GST Summary Table
  const gstSummaryGroups = useMemo(() => {
    const map = new Map<
      string,
      { rate: string; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }
    >();

    items.forEach((it) => {
      const rate = it.gstRate ? Number(it.gstRate).toFixed(2) : "0.00";
      const taxable = Number(it.taxableAmount || it.lineSubtotal || 0);
      const cgst = Number(it.cgstAmount || 0);
      const sgst = Number(it.sgstAmount || 0);
      const igst = Number(it.igstAmount || 0);
      const tax = Number(it.totalTax || 0);

      const existing = map.get(rate) || {
        rate,
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
      };

      existing.taxable += taxable;
      existing.cgst += cgst;
      existing.sgst += sgst;
      existing.igst += igst;
      existing.totalTax += tax;
      map.set(rate, existing);
    });

    return Array.from(map.values()).sort(
      (a, b) => Number(a.rate) - Number(b.rate)
    );
  }, [items]);

  const totalCgstNum = Number(bill.totalCgst || 0);
  const totalSgstNum = Number(bill.totalSgst || 0);
  const totalIgstNum = Number(bill.totalIgst || 0);
  const totalTaxNum = Number(bill.totalTax || bill.taxAmount || 0);

  return (
    <div className="bill-detail-scroll no-scrollbar flex h-full min-h-0 w-full max-w-5xl mx-auto flex-col overflow-hidden px-3 py-4 sm:px-4 md:px-6">
      {/* Action Bar (hidden when printing) */}
      <div className="mb-4 shrink-0 bg-white p-3 md:p-3.5 rounded-2xl border border-slate-200/90 shadow-xs no-print">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center justify-between lg:contents">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
              Bill actions
            </span>
            <div className="flex items-center gap-2">
              {showHistoryBack && (
                <Link
                  href="/app/bills"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 lg:py-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">Back to bills</span>
                </Link>
              )}
              <Link
                href="/app/billing"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 lg:py-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">New Bill</span>
              </Link>
            </div>
          </div>

          {/* Format Switcher */}
          <div className="grid w-full grid-cols-2 gap-0.5 rounded-lg border border-slate-200/80 bg-slate-100 p-0.5 text-xs lg:w-auto lg:shrink-0">
            <button
              type="button"
              onClick={() => setPrintFormat("thermal")}
              className={`rounded-md px-2 py-2 font-bold text-xs transition-colors cursor-pointer sm:px-2.5 lg:py-1.5 ${
                printFormat === "thermal"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Thermal (80mm)
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat("a4")}
              className={`rounded-md px-2 py-2 font-bold text-xs transition-colors cursor-pointer sm:px-2.5 lg:py-1.5 ${
                printFormat === "a4"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tax Invoice (A4)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 lg:ml-auto lg:flex lg:items-center lg:justify-end lg:border-0 lg:pt-0">
            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 cursor-pointer lg:w-auto lg:px-3.5 lg:py-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Print</span>
            </button>

            {/* WhatsApp Share */}
            <WhatsAppBillShare
              billId={bill.id}
              billNumber={bill.billNumber}
              customerName={bill.customerName}
              customerPhone={bill.customerPhone}
              businessName={business.businessName}
              grandTotal={bill.grandTotal}
              googleReviewLink={business.googleReviewLink}
            />

            {/* Copy Public Link */}
            <button
              type="button"
              onClick={copyShareLink}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 cursor-pointer lg:w-auto lg:py-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="whitespace-nowrap">{copied ? "Link Copied" : "Copy Link"}</span>
            </button>

            {/* Cancel Bill Button */}
            {bill.status === "COMPLETED" && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200/60 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 cursor-pointer lg:w-auto lg:py-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Cancel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bill-detail-content no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4 sm:space-y-6">
        {/* Cancellation Warning Banner */}
        {bill.status === "CANCELLED" && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-800 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>This bill was CANCELLED on {bill.cancelledAt || "N/A"}</span>
            </div>
            <p className="text-xs text-red-700">
              <strong>Reason:</strong> {bill.cancellationReason || "No reason recorded"}
            </p>
            <p className="text-[11px] text-red-600">
              Historical transaction data and snapshots are preserved for auditing, but this bill is excluded from active sales.
            </p>
          </div>
        )}

        {/* RENDER VIEW: THERMAL RECEIPT OR A4 INVOICE */}
        {printFormat === "thermal" ? (
        /* THERMAL RECEIPT LAYOUT */
        <div className="thermal-receipt mx-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 shadow-sm sm:p-6">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
            <h2 className="font-extrabold text-base tracking-tight">{business.businessName}</h2>
            {business.address && <p className="text-[11px] text-slate-600">{business.address}</p>}
            {business.state && <p className="text-[11px] text-slate-600">State: {business.state}</p>}
            {business.gstin && (
              <p className="text-[11px] font-bold text-slate-800">GSTIN: {business.gstin}</p>
            )}
            {business.fssai && (
              <p className="text-[11px] font-medium text-slate-700">FSSAI Lic: {business.fssai}</p>
            )}
            {business.businessPhone && (
              <p className="text-[11px] text-slate-600">Tel: {business.businessPhone}</p>
            )}
            {business.businessEmail && (
              <p className="text-[11px] text-slate-600">Email: {business.businessEmail}</p>
            )}
            {business.website && (
              <p className="text-[11px] text-slate-600">Web: {business.website}</p>
            )}
            {isComposition ? (
              <div className="py-1 px-2 my-1 bg-slate-100 text-[10px] font-bold uppercase rounded">
                BILL OF SUPPLY (Composition Taxpayer)
              </div>
            ) : totalTaxNum > 0 ? (
              <div className="py-0.5 text-[10px] font-bold uppercase text-blue-700">
                TAX INVOICE
              </div>
            ) : null}

            <div className="pt-2 text-left text-[11px] text-slate-600 space-y-0.5">
              <div className="flex justify-between">
                <span>Bill #:</span>
                <span className="font-bold text-slate-900">{bill.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{bill.completedAt}</span>
              </div>
              {bill.customerName && bill.customerName !== "Walk-in Customer" && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-900">{bill.customerName}</span>
                </div>
              )}
              {bill.customerGstin && (
                <div className="flex justify-between">
                  <span>Cust GSTIN:</span>
                  <span className="font-bold font-mono text-slate-900">{bill.customerGstin}</span>
                </div>
              )}
              {bill.placeOfSupplyState && (
                <div className="flex justify-between">
                  <span>Place of Supply:</span>
                  <span>{bill.placeOfSupplyState}</span>
                </div>
              )}
            </div>
          </div>

          {/* Item Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-200 mb-2">
              <span className="flex-1">Item</span>
              <span className="text-right w-20">Qty × Price</span>
              <span className="text-right w-16">Total</span>
            </div>
            <div className="space-y-1.5">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between text-[11px]">
                  <div className="flex-1 truncate mr-1">
                    <p className="font-bold truncate">{it.name}</p>
                    {it.gstRate && Number(it.gstRate) > 0 ? (
                      <p className="text-[10px] text-slate-500">
                        GST: {it.gstRate}% {it.priceType === "INCLUSIVE" ? "Incl" : "Excl"}
                        {it.hsnSacCode ? ` | HSN:${it.hsnSacCode}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-slate-600 text-right whitespace-nowrap w-20">
                    {it.quantity} × {it.unitPrice}
                  </span>
                  <span className="font-bold text-right whitespace-nowrap w-16">
                    ₹{it.lineTotal || it.lineSubtotal}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>₹{bill.subtotal}</span>
            </div>
            {Number(bill.discountAmount) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Discount:</span>
                <span>- ₹{bill.discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span>₹{bill.taxableAmount}</span>
            </div>

            {/* GST Breakdown in Thermal Receipt */}
            {totalTaxNum > 0 && (
              <>
                {bill.isInterState ? (
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>IGST:</span>
                    <span>+ ₹{bill.totalIgst || bill.taxAmount}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>CGST:</span>
                      <span>+ ₹{bill.totalCgst || (totalTaxNum / 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>SGST:</span>
                      <span>+ ₹{bill.totalSgst || (totalTaxNum / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>Total GST:</span>
                  <span>+ ₹{bill.totalTax || bill.taxAmount}</span>
                </div>
              </>
            )}

            <div className="flex justify-between font-extrabold text-sm pt-1.5 border-t border-slate-200 text-slate-900">
              <span>Grand Total:</span>
              <span>₹{bill.grandTotal}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Payment Mode:</span>
              <span className="font-semibold text-slate-800">{bill.paymentMethod}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
            {(business.instagram || business.facebook) && (
              <div className="flex items-center justify-center gap-3 font-semibold text-slate-700 text-[10px] pb-1 flex-wrap">
                {business.instagram && (
                  <span className="inline-flex items-center gap-1">
                    <InstagramLogo className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                    <span>{business.instagram}</span>
                  </span>
                )}
                {business.facebook && (
                  <span className="inline-flex items-center gap-1">
                    <FacebookLogo className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{business.facebook}</span>
                  </span>
                )}
              </div>
            )}
            <p>Thank you for your visit!</p>
            <p className="text-[9px] text-slate-400">Powered by BillYours</p>
          </div>
        </div>
      ) : (
        /* A4 INVOICE LAYOUT */
        <div className="a4-invoice space-y-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:space-y-5 sm:p-5 md:space-y-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between sm:pb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{business.businessName}</h2>
              {business.address && <p className="text-sm text-slate-600 mt-1">{business.address}</p>}
              {business.state && (
                <p className="text-xs text-slate-500">
                  State: <strong>{business.state}</strong>, India
                </p>
              )}
              {business.gstin && (
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  GSTIN: <span className="font-mono">{business.gstin}</span>
                </p>
              )}
              {business.fssai && (
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  FSSAI Lic No: <span className="font-mono">{business.fssai}</span>
                </p>
              )}
              {business.businessPhone && (
                <p className="text-xs text-slate-500 mt-0.5">Phone: {business.businessPhone}</p>
              )}
              {business.businessEmail && (
                <p className="text-xs text-slate-500">Email: {business.businessEmail}</p>
              )}
              {business.website && (
                <p className="text-xs text-slate-500">Web: {business.website}</p>
              )}
            </div>

            <div className="space-y-1 text-left sm:text-right">
              <span
                className={`inline-block px-3 py-1 rounded text-xs font-bold tracking-wide ${
                  isComposition
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {isComposition ? "BILL OF SUPPLY" : "TAX INVOICE"}
              </span>
              {isComposition && (
                <p className="text-[10px] text-amber-700 max-w-[200px] leading-tight">
                  Composition taxable person, not eligible to collect tax on supplies
                </p>
              )}
              <p className="font-mono text-base font-bold text-slate-900 mt-2">{bill.billNumber}</p>
              <p className="text-xs text-slate-500">Date: {bill.completedAt}</p>
              <p className="text-xs text-slate-500">
                Status: <span className="font-bold text-slate-900">{bill.status}</span>
              </p>
            </div>
          </div>

          {/* Customer & Payment Info */}
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-2 sm:gap-4 sm:p-4">
            <div>
              <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                Billed To (Customer)
              </span>
              <p className="font-bold text-sm text-slate-900 mt-0.5">{bill.customerName}</p>
              {bill.customerPhone && (
                <p className="text-slate-600 font-mono mt-0.5">Phone: {bill.customerPhone}</p>
              )}
              {bill.customerGstin && (
                <p className="text-slate-700 font-semibold mt-0.5">
                  GSTIN: <span className="font-mono font-bold">{bill.customerGstin}</span>
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="font-bold text-slate-900">
                {bill.paymentStatus === "PAID" ? "Paid" : bill.paymentStatus} via {bill.paymentMethod}
              </p>
            </div>
          </div>

          {/* Line items table with GST details */}
          <div className="no-scrollbar w-full overflow-x-auto print:overflow-visible">
          <table className="min-w-[680px] print:min-w-0 w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-[11px] uppercase font-bold text-slate-600 bg-slate-50/50">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Description</th>
                <th className="py-2.5 px-2">HSN/SAC</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                <th className="py-2.5 px-2 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-2 text-right">GST %</th>
                <th className="py-2.5 px-2 text-right">Tax (₹)</th>
                <th className="py-2.5 px-2 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const isTaxable = item.taxTreatment === "TAXABLE" && Number(item.gstRate || 0) > 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/40">
                    <td className="py-2.5 px-2 text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-2 font-bold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-2 font-mono text-slate-500">{item.hsnSacCode || "—"}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-700">{item.quantity}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700">₹{item.unitPrice}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700">
                      ₹{item.taxableAmount || item.lineSubtotal}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {isTaxable ? (
                        <span className="font-bold text-blue-700">{item.gstRate}%</span>
                      ) : (
                        <span className="text-slate-400">0%</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-700">
                      ₹{item.totalTax || "0.00"}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                      ₹{item.lineTotal || item.lineSubtotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Consolidated Rate-wise GST Summary Table */}
          {totalTaxNum > 0 && gstSummaryGroups.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <TableIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>GST Tax Summary Breakdown</span>
              </div>
              <div className="overflow-x-auto print:overflow-visible">
              <table className="min-w-[520px] print:min-w-0 w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-2 px-3 text-left">GST Rate</th>
                    <th className="py-2 px-3 text-right">Taxable Value</th>
                    {bill.isInterState ? (
                      <th className="py-2 px-3 text-right">IGST Amount</th>
                    ) : (
                      <>
                        <th className="py-2 px-3 text-right">CGST Amount</th>
                        <th className="py-2 px-3 text-right">SGST Amount</th>
                      </>
                    )}
                    <th className="py-2 px-3 text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstSummaryGroups.map((grp) => (
                    <tr key={grp.rate} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-900">{grp.rate}%</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700">
                        ₹{grp.taxable.toFixed(2)}
                      </td>
                      {bill.isInterState ? (
                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                          ₹{grp.igst.toFixed(2)}
                        </td>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-right font-medium text-slate-700">
                            ₹{grp.cgst.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700">
                            ₹{grp.sgst.toFixed(2)}
                          </td>
                        </>
                      )}
                      <td className="py-2 px-3 text-right font-bold text-blue-700">
                        ₹{grp.totalTax.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-extrabold border-t border-slate-200">
                    <td className="py-2 px-3 text-slate-900">Total</td>
                    <td className="py-2 px-3 text-right text-slate-900">
                      ₹{bill.taxableAmount}
                    </td>
                    {bill.isInterState ? (
                      <td className="py-2 px-3 text-right text-slate-900">
                        ₹{bill.totalIgst || bill.taxAmount}
                      </td>
                    ) : (
                      <>
                        <td className="py-2 px-3 text-right text-slate-900">
                          ₹{bill.totalCgst || (totalTaxNum / 2).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-900">
                          ₹{bill.totalSgst || (totalTaxNum / 2).toFixed(2)}
                        </td>
                      </>
                    )}
                    <td className="py-2 px-3 text-right text-blue-700 font-black">
                      ₹{bill.totalTax || bill.taxAmount}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Financial Breakdown & Summary */}
          <div className="flex justify-end pt-3 border-t border-slate-200">
            <div className="w-full max-w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span>₹{bill.subtotal}</span>
              </div>
              {Number(bill.discountAmount) > 0 && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Discount:</span>
                  <span>- ₹{bill.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Taxable Amount:</span>
                <span>₹{bill.taxableAmount}</span>
              </div>

              {totalTaxNum > 0 && (
                <>
                  {bill.isInterState ? (
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>IGST:</span>
                      <span>+ ₹{bill.totalIgst || bill.taxAmount}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <span>CGST:</span>
                        <span>+ ₹{bill.totalCgst || (totalTaxNum / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>SGST:</span>
                        <span>+ ₹{bill.totalSgst || (totalTaxNum / 2).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-1">
                    <span>Total Tax:</span>
                    <span>+ ₹{bill.totalTax || bill.taxAmount}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-900 font-extrabold text-sm text-slate-900">
                <span>Grand Total:</span>
                <span className="text-xl text-blue-600">₹{bill.grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Notes & Footer */}
          {bill.notes && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
              <strong>Notes:</strong> {bill.notes}
            </div>
          )}

          {/* Social and Website Footer for A4 */}
          {(business.website || business.facebook || business.instagram) && (
            <div className="pt-4 pb-2 border-t border-slate-100 flex items-center justify-center gap-6 flex-wrap text-xs text-slate-700 font-semibold">
              {business.website && (
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  {business.website}
                </span>
              )}
              {business.instagram && (
                <span className="flex items-center gap-1.5">
                  <InstagramLogo className="w-4 h-4 text-pink-600 shrink-0" />
                  {business.instagram}
                </span>
              )}
              {business.facebook && (
                <span className="flex items-center gap-1.5">
                  <FacebookLogo className="w-4 h-4 text-blue-700 shrink-0" />
                  {business.facebook}
                </span>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>Thank you for doing business with us!</p>
          </div>
        </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <h3>Cancel Bill #{bill.billNumber}</h3>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this bill? This cannot be undone. Historical transaction data and customer details are safely preserved, but it will be deducted from sales metrics.
            </p>

            {cancelError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {cancelError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Reason for cancellation *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Customer requested refund, item out of stock, incorrect price entered..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleCancelBill}
                className="flex-1 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isPending ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
      <AppFeedbackDialog
        message={feedbackMessage}
        title="Share link"
        variant="info"
        onClose={() => setFeedbackMessage(null)}
      />
    </div>
  );
}
