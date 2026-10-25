"use server";

import { sql } from "@/db";
import { requireAccountOwner } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateBusinessDetailsAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAccountOwner();
    const accountId = session.account.id;

    const businessName = (formData.get("businessName") as string)?.trim();
    const ownerName = (formData.get("ownerName") as string)?.trim();
    const businessPhone = (formData.get("phone") as string)?.trim() || null;
    const businessEmail = (formData.get("email") as string)?.trim().toLowerCase() || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const state = (formData.get("state") as string)?.trim() || null;
    const businessType = (formData.get("businessType") as string)?.trim() || "retail";

    if (!businessName || !ownerName) {
      return { success: false, error: "Business name and owner name are required." };
    }

    await sql`
      UPDATE business_accounts
      SET
        business_name = ${businessName},
        owner_name = ${ownerName},
        business_phone = ${businessPhone},
        business_email = ${businessEmail},
        address = ${address},
        state = ${state},
        business_type = ${businessType},
        updated_at = NOW()
      WHERE id = ${accountId};
    `;

    revalidatePath("/app/settings");
    revalidatePath("/app/billing");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update business details." };
  }
}

export async function updateBillPreferencesAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAccountOwner();
    const accountId = session.account.id;

    const invoicePrefix = ((formData.get("invoicePrefix") as string)?.trim() || "BY").toUpperCase();
    const receiptPreference = (formData.get("receiptPreference") as string) || "thermal";
    const defaultTaxRateStr = formData.get("defaultTaxRate") as string;
    const defaultTaxLabel = (formData.get("defaultTaxLabel") as string)?.trim() || "GST";

    const defaultTaxRateNum = Math.max(0, Math.min(100, Number(defaultTaxRateStr) || 0));

    await sql`
      UPDATE business_accounts
      SET
        invoice_prefix = ${invoicePrefix},
        receipt_preference = ${receiptPreference},
        default_tax_rate = ${defaultTaxRateNum.toFixed(2)},
        default_tax_label = ${defaultTaxLabel},
        updated_at = NOW()
      WHERE id = ${accountId};
    `;

    revalidatePath("/app/settings");
    revalidatePath("/app/billing");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update billing preferences." };
  }
}
