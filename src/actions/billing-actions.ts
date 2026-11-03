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
    unitLabel?: string;
    hsnSacCode?: string | null;
    taxTreatment?: "TAXABLE" | "EXEMPT" | "NIL_RATED" | "NON_GST" | null;
    gstRate?: number | null;
    priceType?: "INCLUSIVE" | "EXCLUSIVE" | null;
  }[];
  idempotencyKey?: string;
  customerName?: string;
  customerPhone?: string;
  customerState?: string;
  customerGstin?: string;
  placeOfSupplyState?: string;
  staffId?: string;
  staffName?: string;
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
  isIdempotentReplay?: boolean;
}

export async function completeBillAction(input: CompleteBillInput): Promise<CompleteBillResponse> {
  let accountId: string = "";
  let payloadHash: string | null = null;

  try {
    const session = await requireActiveSubscription();
    const account = session.account;
    accountId = account.id;

    if (!input.items || input.items.length === 0) {
      return { success: false, error: "Cannot create an empty bill. Please add at least one item." };
    }

    // 1. Strict validation of all line items
    for (let i = 0; i < input.items.length; i++) {
      const it = input.items[i];
      if (!it.name || typeof it.name !== "string" || it.name.trim().length === 0) {
        return { success: false, error: `Item at position ${i + 1} has an empty or invalid name.` };
      }
      if (typeof it.unitPrice !== "number" || isNaN(it.unitPrice) || it.unitPrice < 0) {
        return { success: false, error: `Item "${it.name}" has an invalid unit price.` };
      }
      if (typeof it.quantity !== "number" || isNaN(it.quantity) || it.quantity <= 0) {
        return { success: false, error: `Item "${it.name}" has an invalid quantity (must be greater than 0).` };
      }
    }

    const cleanIdempotencyKey = input.idempotencyKey?.trim() || null;
    const rawPhone = input.customerPhone?.trim() || null;
    const normalizedPhone = normalizePhone(rawPhone);
    const customerState = input.customerState?.trim() || null;
    const customerGstin = input.customerGstin?.trim()?.toUpperCase() || null;

    // 2. Cryptographic payload fingerprint bound to idempotency key
    payloadHash = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          accountId,
          items: input.items.map((it) => ({
            id: it.itemId || null,
            name: it.name.trim(),
            price: Number(it.unitPrice),
            qty: Number(it.quantity),
            tax: it.taxTreatment || "TAXABLE",
            rate: Number(it.gstRate || 0),
            priceType: it.priceType || "EXCLUSIVE",
          })),
          discountType: input.discountType || null,
          discountValue: Number(input.discountValue || 0),
          customerPhone: normalizedPhone || null,
          customerState: customerState || null,
          staffId: input.staffId || null,
        })
      )
      .digest("hex");

    // 3. Idempotency Check: Return existing bill if replay, or reject if payload mismatch
    if (cleanIdempotencyKey) {
      const existingBills = await sql`
        SELECT b.id, b.bill_number, b.grand_total, b.payload_hash
        FROM bills b
        WHERE b.account_id = ${accountId} AND b.idempotency_key = ${cleanIdempotencyKey}
        LIMIT 1;
      `;

      if (existingBills.length > 0) {
        const existing = existingBills[0];
        if (existing.payload_hash && existing.payload_hash !== payloadHash) {
          return {
            success: false,
            error: "Idempotency key conflict: This key was already used for a different checkout request.",
          };
        }
        return {
          success: true,
          billId: existing.id,
          billNumber: existing.bill_number,
          grandTotal: existing.grand_total,
          isIdempotentReplay: true,
        };
      }
    }

    const supplierState = account.state || "";
    const placeOfSupply = input.placeOfSupplyState?.trim() || input.customerState?.trim() || supplierState;

    // 4. Authoritative Recalculation on server using Decimal-safe Item-Level GST Engine
    const calc = calculateBillTotals({
      items: input.items.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        unitLabel: it.unitLabel,
        hsnSacCode: it.hsnSacCode,
        taxTreatment: it.taxTreatment,
        gstRate: it.gstRate,
        priceType: it.priceType,
      })),
      discountType: input.discountType,
      discountValue: input.discountValue,
      supplierState,
      placeOfSupplyState: placeOfSupply,
      gstRegistrationType: account.gstRegistrationType,
      taxEnabled: input.taxEnabled,
      taxRate: input.taxRate,
      taxInclusive: input.taxInclusive,
      taxLabel: input.taxLabel,
    });

    // 5. Handle tenant-scoped customer linking or atomic upsert (race-free)
    let customerId: string | null = null;
    let customerNameSnapshot = input.customerName?.trim() || null;

    if (normalizedPhone) {
      const newCustId = "cst_" + crypto.randomBytes(8).toString("hex");
      const defaultName = customerNameSnapshot || "Customer";

      // Atomic upsert guarantees zero race conditions or duplicate customer creation
      const custRes = await sql`
        INSERT INTO customers (
          id, account_id, name, phone, normalized_phone, state, gstin, created_at, updated_at
        ) VALUES (
          ${newCustId}, ${accountId}, ${defaultName}, ${rawPhone}, ${normalizedPhone},
          ${customerState}, ${customerGstin}, NOW(), NOW()
        )
        ON CONFLICT (account_id, normalized_phone) WHERE archived_at IS NULL AND normalized_phone IS NOT NULL
        DO UPDATE SET
          name = CASE WHEN customers.name IN ('Customer', 'Walk-in Customer') THEN EXCLUDED.name ELSE customers.name END,
          state = COALESCE(EXCLUDED.state, customers.state),
          gstin = COALESCE(EXCLUDED.gstin, customers.gstin),
          updated_at = NOW()
        RETURNING id, name;
      `;

      if (custRes.length > 0) {
        customerId = custRes[0].id;
        if (!customerNameSnapshot) {
          customerNameSnapshot = custRes[0].name;
        }
      }
    }

    // 4. Verify catalog item ownership to strictly prevent cross-tenant catalog references
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

    // 5. Prepare arrays for unnest() batch insertion inside CTE
    const itemIds: string[] = [];
    const catalogItemIds: (string | null)[] = [];
    const itemNames: string[] = [];
    const unitPrices: string[] = [];
    const quantities: number[] = [];
    const lineSubtotals: string[] = [];
    const hsnCodes: (string | null)[] = [];
    const taxTreatments: string[] = [];
    const priceTypes: string[] = [];
    const gstRates: string[] = [];
    const taxableAmounts: string[] = [];
    const cgstRates: string[] = [];
    const cgstAmounts: string[] = [];
    const sgstRates: string[] = [];
    const sgstAmounts: string[] = [];
    const igstRates: string[] = [];
    const igstAmounts: string[] = [];
    const totalTaxes: string[] = [];
    const lineTotals: string[] = [];

    for (let i = 0; i < input.items.length; i++) {
      const raw = input.items[i];
      const processed = calc.items[i];

      itemIds.push("bli_" + crypto.randomBytes(8).toString("hex"));
      const safeItemId = raw.itemId && validItemIds.has(raw.itemId) ? raw.itemId : null;
      catalogItemIds.push(safeItemId);
      itemNames.push(raw.name.trim());
      unitPrices.push(processed.unitPrice);
      quantities.push(Number(processed.quantity));
      lineSubtotals.push(processed.grossSubtotal);
      hsnCodes.push(processed.hsnSacCode || null);
      taxTreatments.push(processed.taxTreatment);
      priceTypes.push(processed.priceType);
      gstRates.push(processed.gstRate);
      taxableAmounts.push(processed.taxableAmount);
      cgstRates.push(processed.cgstRate);
      cgstAmounts.push(processed.cgstAmount);
      sgstRates.push(processed.sgstRate);
      sgstAmounts.push(processed.sgstAmount);
      igstRates.push(processed.igstRate);
      igstAmounts.push(processed.igstAmount);
      totalTaxes.push(processed.totalTax);
      lineTotals.push(processed.lineTotal);
    }

    // Explicit cardinality check: Validate that all 19 arrays have the exact same length as input.items
    const expectedCount = input.items.length;
    const unnestArrays = [
      itemIds, catalogItemIds, itemNames, unitPrices, quantities, lineSubtotals,
      hsnCodes, taxTreatments, priceTypes, gstRates, taxableAmounts,
      cgstRates, cgstAmounts, sgstRates, sgstAmounts, igstRates, igstAmounts,
      totalTaxes, lineTotals
    ];
    for (const arr of unnestArrays) {
      if (arr.length !== expectedCount) {
        throw new Error(`[MULTI_ARRAY_UNNEST_CARDINALITY_ERROR] Expected ${expectedCount} elements in unnest array, but found ${arr.length}. Aborting checkout.`);
      }
    }

    // 6. Setup IDs and tokens for the single atomic write operation
    const billId = "bil_" + crypto.randomBytes(8).toString("hex");
    const seqId = "seq_" + crypto.randomBytes(8).toString("hex");
    const linkId = "shl_" + crypto.randomBytes(8).toString("hex");
    const shareToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(shareToken).digest("hex");
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const currentYear = new Date().getFullYear();
    const prefix = (account.invoicePrefix || "BY").trim().toUpperCase();
    const staffNameSnapshot = input.staffName?.trim() || session.user.name || "Owner";
    const paymentStatus = "PAID";
    const paymentMethod = input.paymentMethod || "CASH";
    const amountPaid = calc.grandTotal;
    const taxLabel = input.taxLabel?.trim() || account.defaultTaxLabel || "GST";

    // 7. Execute sequence allocation, bill insert, line items insert, and share link in ONE ATOMIC STATEMENT
    const createdBills = await sql`
      WITH next_seq AS (
        INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
        VALUES (${seqId}, ${accountId}, ${currentYear}, 1, NOW())
        ON CONFLICT (account_id, year)
        DO UPDATE SET
          current_number = bill_sequences.current_number + 1,
          updated_at = NOW()
        RETURNING current_number
      ),
      inserted_bill AS (
        INSERT INTO bills (
          id, account_id, bill_number, idempotency_key, payload_hash, customer_id, customer_name_snapshot, customer_phone_snapshot,
          staff_id, staff_name_snapshot,
          subtotal, discount_type, discount_value, discount_amount, tax_enabled, tax_label,
          tax_rate, tax_inclusive, taxable_amount, tax_amount,
          place_of_supply_state, is_inter_state, total_cgst, total_sgst, total_igst, total_tax, round_off,
          grand_total, payment_status, payment_method, amount_paid, status, notes,
          completed_at, created_by_user_id, created_at, updated_at
        )
        SELECT
          ${billId},
          ${accountId},
          ${prefix} || '-' || ${currentYear} || '-' || LPAD(next_seq.current_number::text, 6, '0'),
          ${cleanIdempotencyKey},
          ${payloadHash},
          ${customerId},
          ${customerNameSnapshot},
          ${normalizedPhone},
          ${input.staffId || null},
          ${staffNameSnapshot},
          ${calc.subtotal},
          ${calc.discountType},
          ${calc.discountValue},
          ${calc.discountAmount},
          ${calc.taxEnabled},
          ${taxLabel},
          ${calc.taxRate},
          ${calc.taxInclusive},
          ${calc.taxableAmount},
          ${calc.totalTax},
          ${placeOfSupply || null},
          ${calc.isInterState},
          ${calc.totalCgst},
          ${calc.totalSgst},
          ${calc.totalIgst},
          ${calc.totalTax},
          ${calc.roundOff},
          ${calc.grandTotal},
          ${paymentStatus},
          ${paymentMethod},
          ${amountPaid},
          'COMPLETED',
          ${input.notes?.trim() || null},
          NOW(),
          ${session.user.id},
          NOW(),
          NOW()
        FROM next_seq
        RETURNING id, bill_number
      ),
      inserted_items AS (
        INSERT INTO bill_items (
          id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal,
          hsn_sac_code, tax_treatment, price_type, gst_rate, taxable_amount,
          cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_tax, line_total, created_at
        )
        SELECT
          u.id,
          ${accountId},
          b.id,
          u.catalog_item_id,
          u.item_name,
          u.unit_price,
          u.quantity,
          u.line_subtotal,
          u.hsn_code,
          u.tax_treatment,
          u.price_type,
          u.gst_rate,
          u.taxable_amount,
          u.cgst_rate,
          u.cgst_amount,
          u.sgst_rate,
          u.sgst_amount,
          u.igst_rate,
          u.igst_amount,
          u.total_tax,
          u.line_total,
          NOW()
        FROM inserted_bill b
        CROSS JOIN unnest(
          ${itemIds}::varchar[],
          ${catalogItemIds}::varchar[],
          ${itemNames}::varchar[],
          ${unitPrices}::numeric[],
          ${quantities}::numeric[],
          ${lineSubtotals}::numeric[],
          ${hsnCodes}::varchar[],
          ${taxTreatments}::varchar[],
          ${priceTypes}::varchar[],
          ${gstRates}::numeric[],
          ${taxableAmounts}::numeric[],
          ${cgstRates}::numeric[],
          ${cgstAmounts}::numeric[],
          ${sgstRates}::numeric[],
          ${sgstAmounts}::numeric[],
          ${igstRates}::numeric[],
          ${igstAmounts}::numeric[],
          ${totalTaxes}::numeric[],
          ${lineTotals}::numeric[]
        ) AS u(
          id, catalog_item_id, item_name, unit_price, quantity, line_subtotal,
          hsn_code, tax_treatment, price_type, gst_rate, taxable_amount,
          cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_tax, line_total
        )
        RETURNING id
      ),
      inserted_link AS (
        INSERT INTO shared_bill_links (
          id, bill_id, token_hash, expires_at, created_at
        )
        SELECT
          ${linkId},
          b.id,
          ${tokenHash},
          ${expiresAt}::timestamptz,
          NOW()
        FROM inserted_bill b
        RETURNING id
      )
      SELECT id, bill_number FROM inserted_bill;
    `;

    if (!createdBills || createdBills.length === 0) {
      throw new Error("Failed to insert invoice record atomically.");
    }

    const createdBill = createdBills[0];

    // 8. Revalidate paths outside of the database write
    revalidatePath("/app/bills");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/staff");

    return {
      success: true,
      billId: createdBill.id,
      billNumber: createdBill.bill_number,
      shareToken,
      grandTotal: calc.grandTotal,
    };
  } catch (err: any) {
    // 9. Concurrency race handler: If two simultaneous requests pass the initial check,
    // the database unique constraint idx_bills_account_idempotency catches the second one.
    if (err.code === "23505" && err.constraint === "idx_bills_account_idempotency" && input.idempotencyKey) {
      const existing = await sql`
        SELECT b.id, b.bill_number, b.grand_total, b.payload_hash
        FROM bills b
        WHERE b.account_id = ${accountId} AND b.idempotency_key = ${input.idempotencyKey}
        LIMIT 1;
      `;
      if (existing.length > 0) {
        if (existing[0].payload_hash && existing[0].payload_hash !== payloadHash) {
          return {
            success: false,
            error: "Idempotency key conflict: This key was already used for a different bill payload.",
          };
        }
        return {
          success: true,
          billId: existing[0].id,
          billNumber: existing[0].bill_number,
          grandTotal: existing[0].grand_total,
          isIdempotentReplay: true,
        };
      }
    }

    console.error("[ATOMIC_BILL_ERROR]", err?.message || err);
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

/**
 * Soft delete bill from bills history (marks status as CANCELLED)
 */
export async function deleteBillAction(
  billId: string,
  reason: string = "Deleted by user"
): Promise<{ success: boolean; error?: string }> {
  return cancelBillAction(billId, reason || "Deleted by user");
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
