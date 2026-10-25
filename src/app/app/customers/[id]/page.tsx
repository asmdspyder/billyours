import { notFound } from "next/navigation";
import Link from "next/link";
import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";
import { ArrowLeft, User, Phone, Mail, FileText, Receipt, Calendar } from "lucide-react";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Customer Profile — BillYours",
};

export default async function CustomerDetailPage(props: CustomerDetailPageProps) {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;
  const params = await props.params;
  const customerId = params.id;

  // Fetch customer scoped to tenant
  const customerRows = await sql`
    SELECT
      id,
      name,
      phone,
      normalized_phone,
      email,
      notes,
      created_at
    FROM customers
    WHERE id = ${customerId} AND account_id = ${accountId} AND archived_at IS NULL
    LIMIT 1;
  `;

  if (customerRows.length === 0) {
    notFound();
  }

  const customer = customerRows[0];

  // Fetch customer bills scoped to tenant
  const bills = await sql`
    SELECT
      id,
      bill_number,
      subtotal,
      discount_amount,
      tax_amount,
      grand_total,
      payment_status,
      payment_method,
      status,
      completed_at
    FROM bills
    WHERE customer_id = ${customerId} AND account_id = ${accountId}
    ORDER BY completed_at DESC;
  `;

  const totalSpent = bills
    .filter((b) => b.status === "COMPLETED")
    .reduce((sum, b) => sum + Number(b.grand_total), 0);

  const completedCount = bills.filter((b) => b.status === "COMPLETED").length;
  const averageBill = completedCount > 0 ? (totalSpent / completedCount).toFixed(2) : "0.00";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/app/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>

      {/* Customer Header & Profile Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              {customer.phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {customer.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer Stats Cards */}
        <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 text-center">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Spent</p>
            <p className="text-base font-extrabold text-blue-600">₹{totalSpent.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Completed Bills</p>
            <p className="text-base font-extrabold text-slate-900">{completedCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Avg. Bill</p>
            <p className="text-base font-extrabold text-slate-900">₹{averageBill}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-xs text-slate-700">
          <strong className="text-blue-900">Customer Notes:</strong> {customer.notes}
        </div>
      )}

      {/* Purchase History */}
      <div className="space-y-3">
        <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-600" />
          <span>Purchase History ({bills.length} bills)</span>
        </h2>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {bills.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No bills recorded for this customer yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Bill Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Grand Total</th>
                    <th className="px-4 py-3 text-center">Payment</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/bills/${b.id}`}
                          className="font-mono font-bold text-blue-600 hover:underline"
                        >
                          {b.bill_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(b.completed_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Kolkata",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        ₹{Number(b.grand_total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            b.payment_status === "PAID"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {b.payment_status} ({b.payment_method})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            b.status === "COMPLETED"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/app/bills/${b.id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          View Bill
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
