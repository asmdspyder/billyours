import { notFound } from "next/navigation";
import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";
import { BillDetailView } from "@/components/bills/bill-detail-view";
import { createSharedBillLink } from "@/lib/share-link";

interface BillPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string; format?: string; token?: string }>;
}

export const metadata = {
  title: "Bill Details — BillYours",
};

export default async function BillDetailPage(props: BillPageProps) {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;
  const params = await props.params;
  const searchParams = await props.searchParams;
  const billId = params.id;

  // Strict tenant-scoped query
  const bills = await sql`
    SELECT
      b.id,
      b.account_id,
      b.bill_number,
      b.customer_id,
      b.customer_name_snapshot,
      b.customer_phone_snapshot,
      b.subtotal,
      b.discount_type,
      b.discount_value,
      b.discount_amount,
      b.tax_enabled,
      b.tax_label,
      b.tax_rate,
      b.tax_inclusive,
      b.taxable_amount,
      b.tax_amount,
      b.grand_total,
      b.payment_status,
      b.payment_method,
      b.amount_paid,
      b.status,
      b.notes,
      b.completed_at,
      b.cancelled_at,
      b.cancellation_reason,
      u.name as created_by_name
    FROM bills b
    LEFT JOIN users u ON b.created_by_user_id = u.id
    WHERE b.id = ${billId}
      AND b.account_id = ${accountId}
    LIMIT 1;
  `;

  if (bills.length === 0) {
    notFound();
  }

  const bill = bills[0];

  // Fetch immutable line item snapshots
  const items = await sql`
    SELECT
      id,
      item_name_snapshot,
      unit_price,
      quantity,
      line_subtotal
    FROM bill_items
    WHERE bill_id = ${billId} AND account_id = ${accountId}
    ORDER BY created_at ASC;
  `;

  // Use shareToken if provided in query or create if needed
  let shareToken = searchParams.token?.trim() || "";
  if (!shareToken) {
    const tokenGen = await createSharedBillLink(billId);
    shareToken = tokenGen.token;
  }

  return (
    <BillDetailView
      business={session.account}
      bill={{
        id: bill.id,
        billNumber: bill.bill_number,
        customerName: bill.customer_name_snapshot || "Walk-in Customer",
        customerPhone: bill.customer_phone_snapshot,
        subtotal: Number(bill.subtotal).toFixed(2),
        discountType: bill.discount_type,
        discountValue: Number(bill.discount_value).toFixed(2),
        discountAmount: Number(bill.discount_amount).toFixed(2),
        taxEnabled: Boolean(bill.tax_enabled),
        taxLabel: bill.tax_label || "GST",
        taxRate: Number(bill.tax_rate).toFixed(2),
        taxInclusive: Boolean(bill.tax_inclusive),
        taxableAmount: Number(bill.taxable_amount).toFixed(2),
        taxAmount: Number(bill.tax_amount).toFixed(2),
        grandTotal: Number(bill.grand_total).toFixed(2),
        paymentStatus: bill.payment_status as "PAID" | "UNPAID",
        paymentMethod: bill.payment_method || "CASH",
        amountPaid: Number(bill.amount_paid).toFixed(2),
        status: bill.status as "COMPLETED" | "CANCELLED",
        notes: bill.notes,
        completedAt: new Date(bill.completed_at).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kolkata",
        }),
        cancelledAt: bill.cancelled_at
          ? new Date(bill.cancelled_at).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            })
          : null,
        cancellationReason: bill.cancellation_reason,
        createdByName: bill.created_by_name || "Owner",
      }}
      items={items.map((it) => ({
        id: it.id,
        name: it.item_name_snapshot,
        unitPrice: Number(it.unit_price).toFixed(2),
        quantity: Number(it.quantity),
        lineSubtotal: Number(it.line_subtotal).toFixed(2),
      }))}
      shareToken={shareToken}
      initialAutoPrint={searchParams.print === "true"}
      initialFormat={searchParams.format || session.account.receiptPreference || "thermal"}
    />
  );
}
