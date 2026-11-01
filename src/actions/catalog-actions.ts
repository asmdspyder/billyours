"use server";

import crypto from "crypto";
import { sql } from "@/db";
import { requireActiveSubscription, requireBusinessAccount } from "@/lib/auth";
import { formatMoney } from "@/lib/billing-calculations";
import { revalidatePath } from "next/cache";

export async function createItemAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireActiveSubscription();
    const accountId = session.account.id;

    const name = (formData.get("name") as string)?.trim();
    const priceStr = formData.get("price") as string;
    const category = (formData.get("category") as string)?.trim() || null;
    const unitLabel = (formData.get("unitLabel") as string)?.trim() || null;
    const hsnSacCode = (formData.get("hsnSacCode") as string)?.trim() || null;
    const rawTaxTreatment = ((formData.get("taxTreatment") as string)?.trim() || "TAXABLE").toUpperCase();
    const taxTreatment =
      rawTaxTreatment === "EXEMPT" || rawTaxTreatment === "NIL_RATED" || rawTaxTreatment === "NON_GST"
        ? rawTaxTreatment
        : "TAXABLE";
    const gstRateNum = Math.max(0, Math.min(100, Number(formData.get("gstRate")) || 0));
    const priceType = (formData.get("priceType") as string) === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";

    if (!name) {
      return { success: false, error: "Item name is required." };
    }

    const priceNum = Number(priceStr);
    if (isNaN(priceNum) || priceNum < 0) {
      return { success: false, error: "Please enter a valid non-negative price." };
    }

    const itemId = "itm_" + crypto.randomBytes(8).toString("hex");
    const formattedPrice = formatMoney(priceNum);
    const formattedGstRate = formatMoney(taxTreatment === "TAXABLE" ? gstRateNum : 0);

    await sql`
      INSERT INTO items (
        id, account_id, name, category, unit_label, unit_price,
        tax_treatment, gst_rate, price_type, hsn_sac_code,
        is_active, created_at, updated_at
      ) VALUES (
        ${itemId}, ${accountId}, ${name}, ${category}, ${unitLabel}, ${formattedPrice},
        ${taxTreatment}, ${formattedGstRate}, ${priceType}, ${hsnSacCode},
        true, NOW(), NOW()
      );
    `;

    revalidatePath("/app/items");
    revalidatePath("/app/billing");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create item." };
  }
}

export async function updateItemAction(
  itemId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireActiveSubscription();
    const accountId = session.account.id;

    const name = (formData.get("name") as string)?.trim();
    const priceStr = formData.get("price") as string;
    const category = (formData.get("category") as string)?.trim() || null;
    const unitLabel = (formData.get("unitLabel") as string)?.trim() || null;
    const hsnSacCode = (formData.get("hsnSacCode") as string)?.trim() || null;
    const rawTaxTreatment = ((formData.get("taxTreatment") as string)?.trim() || "TAXABLE").toUpperCase();
    const taxTreatment =
      rawTaxTreatment === "EXEMPT" || rawTaxTreatment === "NIL_RATED" || rawTaxTreatment === "NON_GST"
        ? rawTaxTreatment
        : "TAXABLE";
    const gstRateNum = Math.max(0, Math.min(100, Number(formData.get("gstRate")) || 0));
    const priceType = (formData.get("priceType") as string) === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";

    if (!name) {
      return { success: false, error: "Item name is required." };
    }

    const priceNum = Number(priceStr);
    if (isNaN(priceNum) || priceNum < 0) {
      return { success: false, error: "Please enter a valid price." };
    }

    const formattedPrice = formatMoney(priceNum);
    const formattedGstRate = formatMoney(taxTreatment === "TAXABLE" ? gstRateNum : 0);

    // Scoped update ensures tenant isolation
    const result = await sql`
      UPDATE items
      SET
        name = ${name},
        category = ${category},
        unit_label = ${unitLabel},
        unit_price = ${formattedPrice},
        tax_treatment = ${taxTreatment},
        gst_rate = ${formattedGstRate},
        price_type = ${priceType},
        hsn_sac_code = ${hsnSacCode},
        updated_at = NOW()
      WHERE id = ${itemId} AND account_id = ${accountId}
      RETURNING id;
    `;

    if (result.length === 0) {
      return { success: false, error: "Item not found or unauthorized." };
    }

    revalidatePath("/app/items");
    revalidatePath("/app/billing");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update item." };
  }
}

export async function archiveItemAction(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireActiveSubscription();
    const accountId = session.account.id;

    const result = await sql`
      UPDATE items
      SET
        is_active = false,
        archived_at = NOW(),
        updated_at = NOW()
      WHERE id = ${itemId} AND account_id = ${accountId}
      RETURNING id;
    `;

    if (result.length === 0) {
      return { success: false, error: "Item not found or unauthorized." };
    }

    revalidatePath("/app/items");
    revalidatePath("/app/billing");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to archive item." };
  }
}

export async function searchCatalogItemsAction(query: string) {
  try {
    const session = await requireBusinessAccount();
    const accountId = session.account.id;
    const q = query.trim();
    if (!q) return { success: true, items: [] };

    const pattern = `%${q}%`;
    const rows = await sql`
      SELECT
        id,
        name,
        category,
        unit_label,
        unit_price,
        tax_treatment,
        gst_rate,
        price_type,
        hsn_sac_code
      FROM items
      WHERE account_id = ${accountId}
        AND is_active = true
        AND archived_at IS NULL
        AND (name ILIKE ${pattern} OR category ILIKE ${pattern} OR hsn_sac_code ILIKE ${pattern})
      ORDER BY name ASC
      LIMIT 50;
    `;

    return {
      success: true,
      items: rows.map((it: any) => ({
        id: it.id,
        name: it.name,
        category: it.category || null,
        unitLabel: it.unit_label || "",
        unitPrice: Number(it.unit_price),
        taxTreatment: (it.tax_treatment || "TAXABLE") as any,
        gstRate: Number(it.gst_rate || 0),
        priceType: (it.price_type || "EXCLUSIVE") as any,
        hsnSacCode: it.hsn_sac_code || null,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to search catalog items.", items: [] };
  }
}

