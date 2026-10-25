import { notFound } from "next/navigation";
import { getBillByShareToken } from "@/lib/share-link";
import { Receipt, Printer, Store, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

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
  const token = params.token;

  const result = await getBillByShareToken(token);
  if (!result) {
    notFound();
  }

  const { bill, items } = result;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 flex flex-col items-center justify-center">
      {/* Printable Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden print-area">
        {/* Banner */}
        <div className="bg-blue-600 text-white p-5 text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black">{bill.business_name}</h1>
          {bill.business_address && (
            <p className="text-xs text-blue-100">{bill.business_address}</p>
          )}
          {bill.business_phone && (
            <p className="text-xs text-blue-100">Tel: {bill.business_phone}</p>
          )}
        </div>

        {/* Bill Meta */}
        <div className="p-5 border-b border-dashed border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Bill Number:</span>
            <span className="font-mono font-bold text-slate-900">{bill.bill_number}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Date:</span>
            <span className="text-slate-700">
              {new Date(bill.completed_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Kolkata",
              })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Customer:</span>
            <span className="font-semibold text-slate-900">
              {bill.customer_name_snapshot || "Customer"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Payment Status:</span>
            <span className="inline-flex items-center gap-1 font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              {bill.payment_status} ({bill.payment_method})
            </span>
          </div>
        </div>

        {/* Item List */}
        <div className="p-5 border-b border-dashed border-slate-200">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Items Purchased</h3>
          <div className="space-y-2 text-xs">
            {items.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex-1 truncate mr-2">
                  <p className="font-semibold text-slate-900 truncate">{item.item_name_snapshot}</p>
                  <p className="text-[11px] text-slate-500">
                    {Number(item.quantity)} × ₹{Number(item.unit_price).toFixed(2)}
                  </p>
                </div>
                <div className="font-bold text-slate-900">
                  ₹{Number(item.line_subtotal).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Totals */}
        <div className="p-5 bg-slate-50 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>₹{Number(bill.subtotal).toFixed(2)}</span>
          </div>
          {Number(bill.discount_amount) > 0 && (
            <div className="flex justify-between text-green-700 font-medium">
              <span>Discount:</span>
              <span>- ₹{Number(bill.discount_amount).toFixed(2)}</span>
            </div>
          )}
          {bill.tax_enabled && Number(bill.tax_amount) > 0 && (
            <div className="flex justify-between text-slate-700">
              <span>{bill.tax_label || "GST"} ({Number(bill.tax_rate).toFixed(2)}%):</span>
              <span>+ ₹{Number(bill.tax_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900 font-extrabold text-base">
            <span>Grand Total:</span>
            <span className="text-xl text-blue-600">₹{Number(bill.grand_total).toFixed(2)}</span>
          </div>
        </div>

        {/* Print / Save receipt button */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center gap-2 no-print">
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print or Save Receipt</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 text-center text-[10px] text-slate-400 border-t border-slate-100">
          Powered by <strong>BillYours</strong> — Simple billing for every business.
        </div>
      </div>
    </div>
  );
}
