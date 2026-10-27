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
    const paymentStatus = "PAID";
    const paymentMethod = input.paymentMethod || "CASH";
    const amountPaid = calc.grandTotal;
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

    // Batch insert all bill items in ONE SINGLE roundtrip (eliminates sequential N-roundtrip network lag)
    if (input.items.length > 0) {
      // Validate that catalog item IDs actually exist for this tenant.
      // If an item was deleted, reseeded, or comes from an old draft, we gracefully set item_id to null
      // so the historical bill snapshot is saved without violating foreign key constraints.
      const candidateItemIds = input.items
        .map((it) => it.itemId)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

      let validItemIds = new Set<string>();
      if (candidateItemIds.length > 0) {
        const existingItems = await sql`
          SELECT id FROM items
          WHERE account_id = ${accountId} AND id = ANY(${candidateItemIds}::varchar[])
        `;
        validItemIds = new Set(existingItems.map((r: any) => r.id));
      }

      const itemIds: string[] = [];
      const accountIds: string[] = [];
      const billIds: string[] = [];
      const catalogItemIds: (string | null)[] = [];
      const itemNames: string[] = [];
      const unitPrices: string[] = [];
      const quantities: number[] = [];
      const lineSubtotals: string[] = [];

      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        const processed = calc.items[i];
        itemIds.push("bli_" + crypto.randomBytes(8).toString("hex"));
        accountIds.push(accountId);
        billIds.push(billId);
        // Only link catalog item if it truly exists in this tenant's items catalog
        const safeItemId = item.itemId && validItemIds.has(item.itemId) ? item.itemId : null;
        catalogItemIds.push(safeItemId);
        itemNames.push(item.name.trim());
        unitPrices.push(processed.unitPrice);
        quantities.push(Number(processed.quantity));
        lineSubtotals.push(processed.lineSubtotal);
      }

      await sql`
        INSERT INTO bill_items (
          id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at
        )
        SELECT 
          u.id, u.account_id, u.bill_id, u.item_id, u.item_name_snapshot, u.unit_price, u.quantity, u.line_subtotal, NOW()
        FROM unnest(
          ${itemIds}::varchar[],
          ${accountIds}::varchar[],
          ${billIds}::varchar[],
          ${catalogItemIds}::varchar[],
          ${itemNames}::varchar[],
          ${unitPrices}::numeric[],
          ${quantities}::numeric[],
          ${lineSubtotals}::numeric[]
        ) AS u(id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal);
      `;
    }

    // Create shared bill token
    const { token: shareToken } = await createSharedBillLink(billId);

    revalidatePath("/app/bills");
    revalidatePath("/app/dashboard");

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
