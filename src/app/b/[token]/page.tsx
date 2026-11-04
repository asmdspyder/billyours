import { notFound } from "next/navigation";
import { getBillByShareToken } from "@/lib/share-link";
import { ReceiptText, CheckCircle2, Star, ExternalLink } from "lucide-react";
import { PrintReceiptButton } from "@/components/bills/print-receipt-button";
import type { Metadata } from "next";
import { AppTypography } from "@/components/app-typography";

function InstagramLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
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

function FacebookLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
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

interface PublicBillPageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Bill Receipt — BillYours",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicBillPage(props: PublicBillPageProps) {
  const params = await props.params;
  const token = params?.token;

  if (!token) {
    notFound();
  }

  const result = await getBillByShareToken(token);
  if (!result || !result.bill) {
    notFound();
  }

  const { bill, items = [] } = result;

  const billDate = bill.completed_at
    ? new Date(bill.completed_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "N/A";

  const subtotal = Number(bill.subtotal || 0);
  const discountAmount = Number(bill.discount_amount || 0);
  const taxableAmount = Number(bill.taxable_amount || subtotal);
  const totalCgst = Number(bill.total_cgst || 0);
  const totalSgst = Number(bill.total_sgst || 0);
  const totalIgst = Number(bill.total_igst || 0);
  const totalTax = Number(bill.total_tax || bill.tax_amount || 0);
  const grandTotal = Number(bill.grand_total || 0);
  const isInterState = Boolean(bill.is_inter_state);

  return (
    <AppTypography>
      <div className="min-h-screen bg-[#faf7f0] py-6 px-4 flex flex-col items-center justify-center">
      {/* Printable Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden print-area">
        {/* Banner */}
        <div className="bg-blue-600 text-white p-5 text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1">
            <ReceiptText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black">{bill.business_name || "BillYours"}</h1>
          {bill.business_address && (
            <p className="text-xs text-blue-100">{bill.business_address}</p>
          )}
          {bill.business_state && (
            <p className="text-xs text-blue-100">State: {bill.business_state}</p>
          )}
          {bill.business_gstin && (
            <p className="text-xs font-bold font-mono text-blue-50">
              GSTIN: {bill.business_gstin}
            </p>
          )}
          {bill.business_fssai && (
            <p className="text-xs font-mono text-blue-100">
              FSSAI Lic: {bill.business_fssai}
            </p>
          )}
          {bill.business_phone && (
            <p className="text-xs text-blue-100">Tel: {bill.business_phone}</p>
          )}
          {bill.business_email && (
            <p className="text-xs text-blue-100">Email: {bill.business_email}</p>
          )}
          {bill.business_website && (
            <p className="text-xs text-blue-100">Web: {bill.business_website}</p>
          )}
        </div>

        {/* Bill Meta */}
        <div className="p-4 border-b border-dashed border-slate-200 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Bill Number:</span>
            <span className="font-mono font-bold text-slate-900">{bill.bill_number}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Date:</span>
            <span className="text-slate-700">{billDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Customer:</span>
            <span className="font-semibold text-slate-900">
              {bill.customer_name_snapshot || "Customer"}
            </span>
          </div>
          {bill.place_of_supply_state && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Place of Supply:</span>
              <span className="text-slate-700">{bill.place_of_supply_state}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Payment Status:</span>
            <span className="inline-flex items-center gap-1 font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              {bill.payment_status || "PAID"} ({bill.payment_method || "CASH"})
            </span>
          </div>
        </div>

        {/* Item List */}
        <div className="p-4 border-b border-dashed border-slate-200">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2.5">
            Items Purchased
          </h3>
          <div className="space-y-2 text-xs">
            {items.map((item: any) => {
              const hasGst = item.gst_rate && Number(item.gst_rate) > 0;
              return (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1 truncate mr-2">
                    <p className="font-semibold text-slate-900 truncate">{item.item_name_snapshot}</p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span>
                        {Number(item.quantity || 1)} × ₹{Number(item.unit_price || 0).toFixed(2)}
                      </span>
                      {hasGst && (
                        <span className="text-[10px] text-blue-600 font-bold">
                          ({item.gst_rate}% {item.price_type === "INCLUSIVE" ? "Incl" : "GST"})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-slate-900">
                    ₹{Number(item.line_total || item.line_subtotal || 0).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Totals */}
        <div className="p-4 bg-slate-50 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-700 font-medium">
              <span>Discount:</span>
              <span>- ₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Taxable Amount:</span>
            <span>₹{taxableAmount.toFixed(2)}</span>
          </div>

          {/* GST Breakdown */}
          {totalTax > 0 && (
            <>
              {isInterState ? (
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>IGST:</span>
                  <span>+ ₹{totalIgst > 0 ? totalIgst.toFixed(2) : totalTax.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>CGST:</span>
                    <span>
                      + ₹{totalCgst > 0 ? totalCgst.toFixed(2) : (totalTax / 2).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>SGST:</span>
                    <span>
                      + ₹{totalSgst > 0 ? totalSgst.toFixed(2) : (totalTax / 2).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200/80 pt-1">
                <span>Total GST:</span>
                <span>+ ₹{totalTax.toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900 font-extrabold text-base">
            <span>Grand Total:</span>
            <span className="text-xl text-blue-600">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Google Review Prompt (if configured) */}
        {bill.business_google_review_link && (
          <div className="p-4 bg-amber-50/70 border-t border-amber-200/60 no-print">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs font-bold text-amber-950">
                Loved our service? Please rate us on Google!
              </p>
              <a
                href={bill.business_google_review_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <span>Write a Google Review</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Print / Save receipt button (Client Component) */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center gap-2 no-print">
          <PrintReceiptButton />
        </div>

        {/* Footer with vector logos */}
        <div className="p-3 bg-slate-50 text-center text-[10px] text-slate-500 border-t border-slate-100 space-y-1.5">
          {(bill.business_instagram || bill.business_facebook) && (
            <div className="flex items-center justify-center gap-3 font-semibold text-slate-700 flex-wrap">
              {bill.business_instagram && (
                <span className="inline-flex items-center gap-1">
                  <InstagramLogo className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                  <span>{bill.business_instagram}</span>
                </span>
              )}
              {bill.business_facebook && (
                <span className="inline-flex items-center gap-1">
                  <FacebookLogo className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{bill.business_facebook}</span>
                </span>
              )}
            </div>
          )}
          <p className="text-slate-400">
            Powered by <strong>BillYours</strong> — Simple billing for every business.
          </p>
        </div>
      </div>
      </div>
    </AppTypography>
  );
}
