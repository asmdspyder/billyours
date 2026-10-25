"use server";

import crypto from "crypto";
import { sql } from "@/db";
import { requireActiveSubscription, requireBusinessAccount } from "@/lib/auth";
import { calculateBillTotals } from "@/lib/billing-calculations";
import { allocateNextBillNumber } from "@/lib/bill-sequence";
import { normalizePhone } from "@/lib/phone-utils";
import { createSharedBillLink } from "@/lib/share-link";
import { revalidatePath } from "next/cache";

export interface CompleteBillInput {
  items: {
    itemId?: string | null;
    name: string;
    unitPrice: number;
    quantity: number;
  }[];
  customerName?: string;
  customerPhone?: string;
  discountType?: "FIXED" | "PERCENTAGE" | null;
  discountValue?: number;
  taxEnabled?: boolean;
  taxRate?: number;
  taxInclusive?: boolean;
  taxLabel?: string;
  paymentStatus?: "PAID" | "UNPAID";
  paymentMethod?: "CASH" | "UPI" | "CARD" | "OTHER";
  notes?: string;
}

export interface CompleteBillResponse {
  success: boolean;
  error?: string;
  billId?: string;
  billNumber?: string;
  shareToken?: string;
  grandTotal?: string;
}

export async function completeBillAction(input: CompleteBillInput): Promise<CompleteBillResponse> {
  try {
    const session = await requireActiveSubscription();
    const account = session.account;
    const accountId = account.id;

    if (!input.items || input.items.length === 0) {
      return { success: false, error: "Cannot create an empty bill. Please add at least one item." };
    }

    // Recalculate totals authoritatively on server
    const calc = calculateBillTotals({
      items: input.items.map((it) => ({
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
      discountType: input.discountType,
      discountValue: input.discountValue,
      taxEnabled: input.taxEnabled,
      taxRate: input.taxRate,
      taxInclusive: input.taxInclusive,
    });

    // Handle customer linking or creation (tenant scoped)
    let customerId: string | null = null;
    let customerNameSnapshot = input.customerName?.trim() || null;
    const rawPhone = input.customerPhone?.trim() || null;
    const normalizedPhone = normalizePhone(rawPhone);

    if (normalizedPhone) {
      // Find existing customer by normalized phone in this tenant
      const existingCustomers = await sql`
        SELECT id, name FROM customers
        WHERE account_id = ${accountId} AND normalized_phone = ${normalizedPhone}
        LIMIT 1;
      `;

      if (existingCustomers.length > 0) {
        customerId = existingCustomers[0].id;
        if (!customerNameSnapshot) {
          customerNameSnapshot = existingCustomers[0].name;
        }
      } else {
        // Create new customer for this tenant
        const newCustId = "cst_" + crypto.randomBytes(8).toString("hex");
        const defaultName = customerNameSnapshot || "Customer";
        await sql`
          INSERT INTO customers (id, account_id, name, phone, normalized_phone, created_at, updated_at)
          VALUES (${newCustId}, ${accountId}, ${defaultName}, ${rawPhone}, ${normalizedPhone}, NOW(), NOW());
        `;
        customerId = newCustId;
        if (!customerNameSnapshot) {
          customerNameSnapshot = defaultName;
        }
      }
    }

    // Atomically allocate sequential bill number
    const { billNumber } = await allocateNextBillNumber(accountId, account.invoicePrefix || "BY");

    const billId = "bil_" + crypto.randomBytes(8).toString("hex");
    const paymentStatus = input.paymentStatus === "UNPAID" ? "UNPAID" : "PAID";
    const paymentMethod = input.paymentMethod || "CASH";
    const amountPaid = paymentStatus === "PAID" ? calc.grandTotal : "0.00";
    const taxLabel = input.taxLabel?.trim() || account.defaultTaxLabel || "GST";

    // Insert bill record
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, customer_id, customer_name_snapshot, customer_phone_snapshot,
        subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
        tax_rate, tax_inclusive, taxable_amount, tax_amount, grand_total, payment_status,
        payment_method, amount_paid, status, notes, completed_at, created_by_user_id, created_at, updated_at
      ) VALUES (
        ${billId}, ${accountId}, ${billNumber}, ${customerId}, ${customerNameSnapshot}, ${normalizedPhone},
        ${calc.subtotal}, ${calc.discountType}, ${calc.discountValue}, ${calc.discountAmount},
        ${calc.taxEnabled}, ${taxLabel}, ${calc.taxRate}, ${calc.taxInclusive},
        ${calc.taxableAmount}, ${calc.taxAmount}, ${calc.grandTotal}, ${paymentStatus},
        ${paymentMethod}, ${amountPaid}, 'COMPLETED', ${input.notes?.trim() || null}, NOW(),
        ${session.user.id}, NOW(), NOW()
      );
    `;

    // Insert bill items
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const processed = calc.items[i];
      const billItemId = "bli_" + crypto.randomBytes(8).toString("hex");

      await sql`
        INSERT INTO bill_items (
          id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at
        ) VALUES (
          ${billItemId}, ${accountId}, ${billId}, ${item.itemId || null}, ${item.name.trim()},
          ${processed.unitPrice}, ${processed.quantity}, ${processed.lineSubtotal}, NOW()
        );
      `;
    }

    // Create shared bill token
    const { token: shareToken } = await createSharedBillLink(billId);

    revalidatePath("/app/bills");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/customers");

    return {
      success: true,
      billId,
      billNumber,
      shareToken,
      grandTotal: calc.grandTotal,
    };
  } catch (err: any) {
    console.error("Complete bill error:", err);
    return { success: false, error: err.message || "Failed to complete bill. Please try again." };
  }
}

export async function cancelBillAction(
  billId: string,
  cancellationReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireActiveSubscription();
    const accountId = session.account.id;

    if (!cancellationReason || cancellationReason.trim().length < 3) {
      return { success: false, error: "A valid cancellation reason is required." };
    }

    // Scoped update ensuring only tenant's bill can be cancelled
    const result = await sql`
      UPDATE bills
      SET
        status = 'CANCELLED',
        cancelled_at = NOW(),
        cancellation_reason = ${cancellationReason.trim()},
        updated_at = NOW()
      WHERE id = ${billId}
        AND account_id = ${accountId}
        AND status = 'COMPLETED'
      RETURNING id, bill_number;
    `;

    if (result.length === 0) {
      return { success: false, error: "Bill not found or already cancelled." };
    }

    revalidatePath(`/app/bills/${billId}`);
    revalidatePath("/app/bills");
    revalidatePath("/app/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("Cancel bill error:", err);
    return { success: false, error: err.message || "Failed to cancel bill." };
  }
}

export async function lookupCustomerPhoneAction(phone: string): Promise<{
  found: boolean;
  customer?: { id: string; name: string; phone: string };
}> {
  try {
    const session = await requireBusinessAccount();
    const normalized = normalizePhone(phone);
    if (!normalized) return { found: false };

    const customers = await sql`
      SELECT id, name, phone FROM customers
      WHERE account_id = ${session.account.id}
        AND (normalized_phone = ${normalized} OR phone = ${phone.trim()})
        AND archived_at IS NULL
      LIMIT 1;
    `;

    if (customers.length > 0) {
      return {
        found: true,
        customer: {
          id: customers[0].id,
          name: customers[0].name,
          phone: customers[0].phone || normalized,
        },
      };
    }

    return { found: false };
  } catch (err) {
    return { found: false };
  }
}
