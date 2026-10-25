"use server";

import crypto from "crypto";
import { sql } from "@/db";
import { requireActiveSubscription, requireBusinessAccount } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone-utils";
import { revalidatePath } from "next/cache";

export async function createCustomerAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; customerId?: string }> {
  try {
    const session = await requireActiveSubscription();
    const accountId = session.account.id;

    const name = (formData.get("name") as string)?.trim();
    const rawPhone = (formData.get("phone") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;

    if (!name) {
      return { success: false, error: "Customer name is required." };
    }

    const normalized = normalizePhone(rawPhone);

    // If phone provided, ensure no duplicate active customer exists in this tenant
    if (normalized) {
      const existing = await sql`
        SELECT id FROM customers
        WHERE account_id = ${accountId} AND normalized_phone = ${normalized} AND archived_at IS NULL
        LIMIT 1;
      `;
      if (existing.length > 0) {
        return { success: false, error: "A customer with this phone number already exists in your records." };
      }
    }

    const customerId = "cst_" + crypto.randomBytes(8).toString("hex");

    await sql`
      INSERT INTO customers (id, account_id, name, phone, normalized_phone, email, notes, created_at, updated_at)
      VALUES (${customerId}, ${accountId}, ${name}, ${rawPhone}, ${normalized}, ${email}, ${notes}, NOW(), NOW());
    `;

    revalidatePath("/app/customers");
    return { success: true, customerId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create customer." };
  }
}

export async function updateCustomerAction(
  customerId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireActiveSubscription();
    const accountId = session.account.id;

    const name = (formData.get("name") as string)?.trim();
    const rawPhone = (formData.get("phone") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;

    if (!name) {
      return { success: false, error: "Customer name is required." };
    }

    const normalized = normalizePhone(rawPhone);

    // Check duplicate phone in same tenant excluding current customer
    if (normalized) {
      const existing = await sql`
        SELECT id FROM customers
        WHERE account_id = ${accountId}
          AND normalized_phone = ${normalized}
          AND id != ${customerId}
          AND archived_at IS NULL
        LIMIT 1;
      `;
      if (existing.length > 0) {
        return { success: false, error: "Another customer already uses this phone number." };
      }
    }

    const result = await sql`
      UPDATE customers
      SET
        name = ${name},
        phone = ${rawPhone},
        normalized_phone = ${normalized},
        email = ${email},
        notes = ${notes},
        updated_at = NOW()
      WHERE id = ${customerId} AND account_id = ${accountId}
      RETURNING id;
    `;

    if (result.length === 0) {
      return { success: false, error: "Customer not found or unauthorized." };
    }

    revalidatePath(`/app/customers/${customerId}`);
    revalidatePath("/app/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update customer." };
  }
}

export async function archiveCustomerAction(
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireActiveSubscription();
    const accountId = session.account.id;

    const result = await sql`
      UPDATE customers
      SET
        archived_at = NOW(),
        updated_at = NOW()
      WHERE id = ${customerId} AND account_id = ${accountId}
      RETURNING id;
    `;

    if (result.length === 0) {
      return { success: false, error: "Customer not found or unauthorized." };
    }

    revalidatePath("/app/customers");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to archive customer." };
  }
}
