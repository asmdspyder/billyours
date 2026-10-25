"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sql } from "@/db";
import { createSession, clearSession, getCurrentSession } from "@/lib/session";
import { normalizePhone } from "@/lib/phone-utils";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Please enter your email and password." };
  }

  const users = await sql`
    SELECT id, name, email, password_hash, role FROM users WHERE email = ${email} LIMIT 1;
  `;

  if (users.length === 0) {
    return { success: false, error: "Invalid email or password." };
  }

  const user = users[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: "Invalid email or password." };
  }

  // Find active business account
  const memberships = await sql`
    SELECT account_id FROM account_memberships
    WHERE user_id = ${user.id}
    ORDER BY created_at ASC
    LIMIT 1;
  `;

  const activeAccountId = memberships.length > 0 ? memberships[0].account_id : null;

  await createSession(user.id, activeAccountId);

  // If user is Admin and has no business account, go to /admin
  if (user.role === "ADMIN" && !activeAccountId) {
    redirect("/admin");
  }

  redirect("/app/billing");
}

export async function signupAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const businessName = (formData.get("businessName") as string)?.trim();
  const ownerName = (formData.get("ownerName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const businessType = (formData.get("businessType") as string)?.trim() || "retail";
  const businessPhone = (formData.get("phone") as string)?.trim();

  if (!businessName || !ownerName || !email || !password) {
    return { success: false, error: "Please fill in all required fields." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  // Check if email already registered
  const existingUsers = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1;
  `;
  if (existingUsers.length > 0) {
    return { success: false, error: "An account with this email already exists. Please log in." };
  }

  const userId = "usr_" + crypto.randomBytes(8).toString("hex");
  const accountId = "acc_" + crypto.randomBytes(8).toString("hex");
  const membershipId = "mem_" + crypto.randomBytes(8).toString("hex");

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const trialDays = Number(process.env.DEFAULT_TRIAL_DAYS) || 7;
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  // Atomic creation of user, business tenant, and membership
  try {
    await sql`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (${userId}, ${ownerName}, ${email}, ${passwordHash}, 'USER', NOW(), NOW());
    `;

    await sql`
      INSERT INTO business_accounts (
        id, business_name, owner_name, business_type, business_email, business_phone,
        currency, timezone, invoice_prefix, receipt_preference, default_tax_rate,
        default_tax_label, status, subscription_status, trial_starts_at, trial_ends_at,
        created_at, updated_at
      )
      VALUES (
        ${accountId}, ${businessName}, ${ownerName}, ${businessType}, ${email},
        ${businessPhone || null}, 'INR', 'Asia/Kolkata', 'BY', 'thermal', '0.00',
        'GST', 'ACTIVE', 'TRIAL', NOW(), ${trialEnds.toISOString()}, NOW(), NOW()
      );
    `;

    await sql`
      INSERT INTO account_memberships (id, account_id, user_id, role, created_at)
      VALUES (${membershipId}, ${accountId}, ${userId}, 'OWNER', NOW());
    `;

    // Also seed a default sequence
    const seqId = "seq_" + crypto.randomBytes(8).toString("hex");
    await sql`
      INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
      VALUES (${seqId}, ${accountId}, ${now.getFullYear()}, 0, NOW());
    `;

  } catch (err: any) {
    console.error("Signup error:", err);
    return { success: false, error: "Failed to create account. Please try again." };
  }

  // Create session and set cookie
  await createSession(userId, accountId);

  redirect("/app/billing?welcome=true");
}

export async function adminLoginAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Please enter your admin credentials." };
  }

  const users = await sql`
    SELECT id, name, email, password_hash, role FROM users WHERE email = ${email} LIMIT 1;
  `;

  if (users.length === 0) {
    return { success: false, error: "Invalid credentials." };
  }

  const user = users[0];
  if (user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized. Platform administrator privileges required." };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: "Invalid credentials." };
  }

  await createSession(user.id, null);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
