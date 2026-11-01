"use server";

import crypto from "crypto";
import { sql } from "@/db";

export interface PaidSetupRequestInput {
  plan: "Monthly" | "Yearly";
  businessName: string;
  contactName: string;
  phone: string;
  email?: string;
  city?: string;
}

export async function submitPaidSetupRequestAction(
  data: PaidSetupRequestInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const businessName = data.businessName?.trim();
    const contactName = data.contactName?.trim();
    const phone = data.phone?.trim();
    const plan = data.plan;

    if (!businessName || !contactName || !phone) {
      return { success: false, error: "Please fill in business name, contact name, and phone number." };
    }

    const id = "req_" + crypto.randomBytes(8).toString("hex");

    await sql`
      INSERT INTO paid_setup_requests (
        id, plan, business_name, contact_name, phone, email, city, created_at
      )
      VALUES (
        ${id}, ${plan}, ${businessName}, ${contactName}, ${phone},
        ${data.email?.trim() || null}, ${data.city?.trim() || null}, NOW()
      );
    `;

    return { success: true };
  } catch (err: any) {
    console.error("Error submitting paid setup request:", err);
    // Even if DB fails, don't block the user from seeing the setup contact numbers
    return { success: true };
  }
}
