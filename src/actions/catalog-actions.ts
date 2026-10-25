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
    const unitLabel = (formData.get("unitLabel") as string)?.trim() || "piece";

    if (!name) {
      return { success: false, error: "Item name is required." };
    }

    const priceNum = Number(priceStr);
    if (isNaN(priceNum) || priceNum < 0) {
      return { success: false, error: "Please enter a valid non-negative price." };
    }

    const itemId = "itm_" + crypto.randomBytes(8).toString("hex");
    const formattedPrice = formatMoney(priceNum);

    await sql`
      INSERT INTO items (id, account_id, name, category, unit_label, unit_price, is_active, created_at, updated_at)
      VALUES (${itemId}, ${accountId}, ${name}, ${category}, ${unitLabel}, ${formattedPrice}, true, NOW(), NOW());
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
    const unitLabel = (formData.get("unitLabel") as string)?.trim() || "piece";

    if (!name) {
      return { success: false, error: "Item name is required." };
    }

    const priceNum = Number(priceStr);
    if (isNaN(priceNum) || priceNum < 0) {
      return { success: false, error: "Please enter a valid price." };
    }

    const formattedPrice = formatMoney(priceNum);

    // Scoped update ensures tenant isolation
    const result = await sql`
      UPDATE items
      SET
        name = ${name},
        category = ${category},
        unit_label = ${unitLabel},
        unit_price = ${formattedPrice},
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
