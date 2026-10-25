"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Printer,
  Share2,
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
  X,
} from "lucide-react";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { getBillShareUrl } from "@/lib/base-url";
import { cancelBillAction } from "@/actions/billing-actions";

interface BillItem {
  id: string;
  name: string;
  unitPrice: string;
  quantity: number;
  lineSubtotal: string;
}

interface BillData {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string | null;
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
  };
  bill: BillData;
  items: BillItem[];
  shareToken: string;
  initialAutoPrint?: boolean;
  initialFormat?: string;
}

export function BillDetailView({
  business,
  bill,
  items,
  shareToken,
  initialAutoPrint,
  initialFormat = "thermal",
}: BillDetailViewProps) {
  const [printFormat, setPrintFormat] = useState<"thermal" | "a4">(
    initialFormat === "a4" ? "a4" : "thermal"
  );
  const [copied, setCopied] = useState(false);
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

  const publicShareUrl = getBillShareUrl(shareToken);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError("Please provide a reason for cancelling this bill.");
      return;
    }

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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Link
          href="/app/bills"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bills</span>
        </Link>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs">
            <button
              onClick={() => setPrintFormat("thermal")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                printFormat === "thermal" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Thermal Receipt
            </button>
            <button
              onClick={() => setPrintFormat("a4")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                printFormat === "a4" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              A4 Invoice
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {/* WhatsApp Share */}
          {bill.customerPhone && (
            <a
              href={
                buildWhatsAppShareUrl({
                  phone: bill.customerPhone,
                  customerName: bill.customerName,
                  businessName: business.businessName,
                  billNumber: bill.billNumber,
                  grandTotal: bill.grandTotal,
                  billLink: publicShareUrl,
                }) || "#"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          {/* Copy Public Link */}
          <button
            onClick={copyShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied" : "Copy Link"}</span>
          </button>

          {/* Cancel Bill Button */}
          {bill.status === "COMPLETED" && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Bill</span>
            </button>
          )}
        </div>
      </div>

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
        <div className="thermal-receipt bg-white border border-slate-200 rounded-xl p-6 shadow-sm mx-auto max-w-sm text-slate-900 font-mono text-xs">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
            <h2 className="font-extrabold text-base tracking-tight">{business.businessName}</h2>
            {business.address && <p className="text-[11px] text-slate-600">{business.address}</p>}
            {business.businessPhone && (
              <p className="text-[11px] text-slate-600">Tel: {business.businessPhone}</p>
            )}
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
            </div>
          </div>

          {/* Item Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-slate-200 mb-2">
              <span>Item</span>
              <span className="text-right">Qty × Price</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-1.5">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between text-[11px]">
                  <span className="flex-1 truncate mr-2">{it.name}</span>
                  <span className="text-slate-600 text-right whitespace-nowrap mr-2">
                    {it.quantity} × {it.unitPrice}
                  </span>
                  <span className="font-bold text-right whitespace-nowrap">₹{it.lineSubtotal}</span>
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
            {bill.taxEnabled && Number(bill.taxAmount) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>{bill.taxLabel} ({bill.taxRate}%):</span>
                <span>+ ₹{bill.taxAmount}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-200 text-slate-900">
              <span>Grand Total:</span>
              <span>₹{bill.grandTotal}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Payment:</span>
              <span>{bill.paymentStatus} via {bill.paymentMethod}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-3 text-[10px] text-slate-500 space-y-0.5">
            <p>Thank you for your visit!</p>
            <p className="text-[9px] text-slate-400">Powered by BillYours</p>
          </div>
        </div>
      ) : (
        /* A4 INVOICE LAYOUT */
        <div className="a4-invoice bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{business.businessName}</h2>
              {business.address && <p className="text-sm text-slate-600 mt-1">{business.address}</p>}
              {business.state && <p className="text-xs text-slate-500">{business.state}, India</p>}
              {business.businessPhone && (
                <p className="text-xs text-slate-500 mt-0.5">Phone: {business.businessPhone}</p>
              )}
              {business.businessEmail && (
                <p className="text-xs text-slate-500">Email: {business.businessEmail}</p>
              )}
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold tracking-wide">
                TAX INVOICE / BILL
              </span>
              <p className="font-mono text-base font-bold text-slate-900 mt-2">{bill.billNumber}</p>
              <p className="text-xs text-slate-500">Date: {bill.completedAt}</p>
              <p className="text-xs text-slate-500">
                Status: <span className="font-bold text-slate-900">{bill.status}</span>
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-slate-50 p-4 rounded-lg flex justify-between text-xs">
            <div>
              <span className="text-slate-400 uppercase font-semibold text-[10px]">Billed To</span>
              <p className="font-bold text-sm text-slate-900 mt-0.5">{bill.customerName}</p>
              {bill.customerPhone && (
                <p className="text-slate-600 font-mono mt-0.5">{bill.customerPhone}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-slate-400 uppercase font-semibold text-[10px]">Payment Details</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {bill.paymentStatus} ({bill.paymentMethod})
              </p>
              <p className="text-slate-500 mt-0.5">Amount: ₹{bill.grandTotal}</p>
            </div>
          </div>

          {/* Line items table */}
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <th className="py-2.5">#</th>
                <th className="py-2.5">Description</th>
                <th className="py-2.5 text-right">Unit Price</th>
                <th className="py-2.5 text-right">Quantity</th>
                <th className="py-2.5 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-3 text-xs text-slate-400">{idx + 1}</td>
                  <td className="py-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="py-3 text-right text-slate-600">₹{item.unitPrice}</td>
                  <td className="py-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-3 text-right font-bold text-slate-900">₹{item.lineSubtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Breakdown */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{bill.subtotal}</span>
              </div>
              {Number(bill.discountAmount) > 0 && (
                <div className="flex justify-between text-green-700 font-medium">
                  <span>Discount:</span>
                  <span>- ₹{bill.discountAmount}</span>
                </div>
              )}
              {bill.taxEnabled && Number(bill.taxAmount) > 0 && (
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>{bill.taxLabel} ({bill.taxRate}%):</span>
                  <span>+ ₹{bill.taxAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-300 font-extrabold text-base text-slate-900">
                <span>Grand Total:</span>
                <span className="text-xl text-blue-600">₹{bill.grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Notes & Footer */}
          {bill.notes && (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
              <strong>Notes:</strong> {bill.notes}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>Thank you for your business!</p>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <h3>Cancel Bill #{bill.billNumber}</h3>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Cancelling a bill will preserve the historical record and bill number, but excludes its financial totals from your active sales dashboard.
            </p>

            {cancelError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg">{cancelError}</div>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Customer returned items, wrong quantity entered, or order cancelled."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Keep Bill
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs"
                >
                  {isPending ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
