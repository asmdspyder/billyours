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

  // Strict tenant-scoped query with customer, user, and live business account joins
  const bills = await sql`
    SELECT
      b.id,
      b.account_id,
      b.bill_number,
      b.customer_id,
      b.customer_name_snapshot,
      b.customer_phone_snapshot,
      b.staff_id,
      b.staff_name_snapshot,
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
      b.place_of_supply_state,
      b.is_inter_state,
      b.total_cgst,
      b.total_sgst,
      b.total_igst,
      b.total_tax,
      b.round_off,
      b.grand_total,
      b.payment_status,
      b.payment_method,
      b.amount_paid,
      b.status,
      b.notes,
      b.completed_at,
      b.cancelled_at,
      b.cancellation_reason,
      u.name as created_by_name,
      c.gstin as customer_gstin,
      c.state as customer_state,
      ba.business_name,
      ba.owner_name,
      ba.business_phone,
      ba.business_email,
      ba.address as business_address,
      ba.state as business_state,
      ba.currency,
      ba.gstin as business_gstin,
      ba.gst_registration_type as business_gst_type,
      ba.fssai as business_fssai,
      ba.website as business_website,
      ba.facebook as business_facebook,
      ba.instagram as business_instagram,
      ba.google_review_link as business_google_review_link
    FROM bills b
    JOIN business_accounts ba ON b.account_id = ba.id
    LEFT JOIN users u ON b.created_by_user_id = u.id
    LEFT JOIN customers c ON b.customer_id = c.id
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
      line_subtotal,
      hsn_sac_code,
      tax_treatment,
      price_type,
      gst_rate,
      taxable_amount,
      cgst_rate,
      cgst_amount,
      sgst_rate,
      sgst_amount,
      igst_rate,
      igst_amount,
      total_tax,
      line_total
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
      business={{
        id: accountId,
        businessName: bill.business_name || session.account.businessName,
        ownerName: bill.owner_name || session.account.ownerName,
        businessPhone: bill.business_phone || session.account.businessPhone,
        businessEmail: bill.business_email || session.account.businessEmail,
        address: bill.business_address || session.account.address,
        state: bill.business_state || session.account.state,
        currency: bill.currency || session.account.currency || "INR",
        gstin: bill.business_gstin || session.account.gstin || null,
        gstRegistrationType: bill.business_gst_type || session.account.gstRegistrationType || "REGULAR",
        fssai: bill.business_fssai || session.account.fssai || null,
        website: bill.business_website || session.account.website || null,
        facebook: bill.business_facebook || session.account.facebook || null,
        instagram: bill.business_instagram || session.account.instagram || null,
        googleReviewLink: bill.business_google_review_link || session.account.googleReviewLink || null,
      }}
      bill={{
        id: bill.id,
        billNumber: bill.bill_number,
        customerName: bill.customer_name_snapshot || "Walk-in Customer",
        customerPhone: bill.customer_phone_snapshot,
        customerGstin: bill.customer_gstin || null,
        customerState: bill.customer_state || null,
        placeOfSupplyState: bill.place_of_supply_state || bill.customer_state || bill.business_state || session.account.state || "Delhi",
        isInterState: Boolean(bill.is_inter_state),
        subtotal: Number(bill.subtotal).toFixed(2),
        discountType: bill.discount_type,
        discountValue: Number(bill.discount_value).toFixed(2),
        discountAmount: Number(bill.discount_amount).toFixed(2),
        taxEnabled: Boolean(bill.tax_enabled),
        taxLabel: bill.tax_label || "GST",
        taxRate: Number(bill.tax_rate).toFixed(2),
        taxInclusive: Boolean(bill.tax_inclusive),
        taxableAmount: Number(bill.taxable_amount || bill.subtotal).toFixed(2),
        taxAmount: Number(bill.tax_amount).toFixed(2),
        totalCgst: Number(bill.total_cgst || 0).toFixed(2),
        totalSgst: Number(bill.total_sgst || 0).toFixed(2),
        totalIgst: Number(bill.total_igst || 0).toFixed(2),
        totalTax: Number(bill.total_tax || bill.tax_amount || 0).toFixed(2),
        roundOff: Number(bill.round_off || 0).toFixed(2),
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
        staffId: bill.staff_id || null,
        staffNameSnapshot: bill.staff_name_snapshot || bill.created_by_name || null,
      }}
      items={items.map((it) => ({
        id: it.id,
        name: it.item_name_snapshot,
        unitPrice: Number(it.unit_price).toFixed(2),
        quantity: Number(it.quantity),
        lineSubtotal: Number(it.line_subtotal).toFixed(2),
        hsnSacCode: it.hsn_sac_code || null,
        taxTreatment: it.tax_treatment || "TAXABLE",
        priceType: it.price_type || "EXCLUSIVE",
        gstRate: it.gst_rate !== null && it.gst_rate !== undefined ? Number(it.gst_rate).toFixed(2) : null,
        taxableAmount: it.taxable_amount !== null && it.taxable_amount !== undefined ? Number(it.taxable_amount).toFixed(2) : null,
        cgstRate: it.cgst_rate !== null && it.cgst_rate !== undefined ? Number(it.cgst_rate).toFixed(2) : null,
        cgstAmount: it.cgst_amount !== null && it.cgst_amount !== undefined ? Number(it.cgst_amount).toFixed(2) : null,
        sgstRate: it.sgst_rate !== null && it.sgst_rate !== undefined ? Number(it.sgst_rate).toFixed(2) : null,
        sgstAmount: it.sgst_amount !== null && it.sgst_amount !== undefined ? Number(it.sgst_amount).toFixed(2) : null,
        igstRate: it.igst_rate !== null && it.igst_rate !== undefined ? Number(it.igst_rate).toFixed(2) : null,
        igstAmount: it.igst_amount !== null && it.igst_amount !== undefined ? Number(it.igst_amount).toFixed(2) : null,
        totalTax: it.total_tax !== null && it.total_tax !== undefined ? Number(it.total_tax).toFixed(2) : null,
        lineTotal: it.line_total !== null && it.line_total !== undefined ? Number(it.line_total).toFixed(2) : Number(it.line_subtotal).toFixed(2),
      }))}
      shareToken={shareToken}
      initialAutoPrint={searchParams.print === "true"}
      initialFormat={searchParams.format || session.account.receiptPreference || "thermal"}
    />
  );
}
