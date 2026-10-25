"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sql } from "@/db";
import { requirePlatformAdmin, recordAdminAuditLog } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function adminCreateAccountAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; accountId?: string }> {
  try {
    const adminSession = await requirePlatformAdmin();

    const businessName = (formData.get("businessName") as string)?.trim();
    const ownerName = (formData.get("ownerName") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = (formData.get("password") as string) || "Welcome2026!";
    const businessType = (formData.get("businessType") as string)?.trim() || "retail";
    const phone = (formData.get("phone") as string)?.trim() || null;
    const trialDays = Number(formData.get("trialDays")) || 7;

    if (!businessName || !ownerName || !email) {
      return { success: false, error: "Business name, owner name, and email are required." };
    }

    // Check if user already exists
    let userId: string;
    const existingUsers = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1;`;
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
    } else {
      userId = "usr_" + crypto.randomBytes(8).toString("hex");
      const passwordHash = await bcrypt.hash(password, 10);
      await sql`
        INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
        VALUES (${userId}, ${ownerName}, ${email}, ${passwordHash}, 'USER', NOW(), NOW());
      `;
    }

    const accountId = "acc_" + crypto.randomBytes(8).toString("hex");
    const membershipId = "mem_" + crypto.randomBytes(8).toString("hex");
    const trialEnds = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO business_accounts (
        id, business_name, owner_name, business_type, business_email, business_phone,
        currency, timezone, invoice_prefix, receipt_preference, status, subscription_status,
        trial_starts_at, trial_ends_at, created_at, updated_at
      )
      VALUES (
        ${accountId}, ${businessName}, ${ownerName}, ${businessType}, ${email}, ${phone},
        'INR', 'Asia/Kolkata', 'BY', 'thermal', 'ACTIVE', 'TRIAL',
        NOW(), ${trialEnds.toISOString()}, NOW(), NOW()
      );
    `;

    await sql`
      INSERT INTO account_memberships (id, account_id, user_id, role, created_at)
      VALUES (${membershipId}, ${accountId}, ${userId}, 'OWNER', NOW());
    `;

    // Initialize sequence
    const seqId = "seq_" + crypto.randomBytes(8).toString("hex");
    await sql`
      INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
      VALUES (${seqId}, ${accountId}, ${new Date().getFullYear()}, 0, NOW());
    `;

    await recordAdminAuditLog(adminSession.user.id, accountId, "ACCOUNT_CREATED", {
      businessName,
      ownerEmail: email,
      trialDays,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/accounts");
    return { success: true, accountId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create account." };
  }
}

export async function updateAccountStatusAction(
  accountId: string,
  newStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED"
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSession = await requirePlatformAdmin();

    const previous = await sql`SELECT status, business_name FROM business_accounts WHERE id = ${accountId} LIMIT 1;`;
    if (previous.length === 0) {
      return { success: false, error: "Account not found." };
    }

    const archivedAt = newStatus === "ARCHIVED" ? new Date().toISOString() : null;

    await sql`
      UPDATE business_accounts
      SET
        status = ${newStatus},
        archived_at = ${archivedAt},
        updated_at = NOW()
      WHERE id = ${accountId};
    `;

    await recordAdminAuditLog(adminSession.user.id, accountId, "STATUS_CHANGE", {
      from: previous[0].status,
      to: newStatus,
    });

    revalidatePath(`/admin/accounts/${accountId}`);
    revalidatePath("/admin/accounts");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update account status." };
  }
}

export async function updateAccountSubscriptionAction(
  accountId: string,
  data: {
    subscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED";
    subscriptionPlan?: "MONTHLY" | "YEARLY" | null;
    trialEndsAt?: string;
    subscriptionEndsAt?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSession = await requirePlatformAdmin();

    const previous = await sql`
      SELECT subscription_status, subscription_plan, trial_ends_at, subscription_ends_at
      FROM business_accounts WHERE id = ${accountId} LIMIT 1;
    `;
    if (previous.length === 0) {
      return { success: false, error: "Account not found." };
    }

    await sql`
      UPDATE business_accounts
      SET
        subscription_status = ${data.subscriptionStatus},
        subscription_plan = ${data.subscriptionPlan || null},
        trial_ends_at = ${data.trialEndsAt ? new Date(data.trialEndsAt).toISOString() : previous[0].trial_ends_at},
        subscription_ends_at = ${data.subscriptionEndsAt ? new Date(data.subscriptionEndsAt).toISOString() : null},
        updated_at = NOW()
      WHERE id = ${accountId};
    `;

    await recordAdminAuditLog(adminSession.user.id, accountId, "SUBSCRIPTION_UPDATE", {
      before: previous[0],
      after: data,
    });

    revalidatePath(`/admin/accounts/${accountId}`);
    revalidatePath("/admin/accounts");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update subscription." };
  }
}

/**
 * Start secure audited impersonation session for admin support.
 */
export async function startImpersonationAction(targetAccountId: string): Promise<void> {
  const adminSession = await requirePlatformAdmin();

  // Validate target account exists
  const targetAcc = await sql`
    SELECT id, business_name FROM business_accounts WHERE id = ${targetAccountId} LIMIT 1;
  `;
  if (targetAcc.length === 0) {
    throw new Error("Target account not found");
  }

  // Update admin's current session with activeAccountId = targetAccountId and impersonatedByAdminId = adminSession.user.id
  await sql`
    UPDATE sessions
    SET
      active_account_id = ${targetAccountId},
      impersonated_by_admin_id = ${adminSession.user.id}
    WHERE id = ${adminSession.session.id};
  `;

  await recordAdminAuditLog(
    adminSession.user.id,
    targetAccountId,
    "IMPERSONATION_STARTED",
    { targetBusinessName: targetAcc[0].business_name },
    adminSession.session.id
  );

  redirect("/app/billing");
}

/**
 * Stop impersonation and return to admin panel.
 */
export async function stopImpersonationAction(): Promise<void> {
  const session = await requirePlatformAdmin();
  const targetAccountId = session.session.activeAccountId;

  // Clear impersonation on session
  await sql`
    UPDATE sessions
    SET
      active_account_id = NULL,
      impersonated_by_admin_id = NULL
    WHERE id = ${session.session.id};
  `;

  if (targetAccountId) {
    await recordAdminAuditLog(
      session.user.id,
      targetAccountId,
      "IMPERSONATION_ENDED",
      {},
      session.session.id
    );
  }

  redirect(targetAccountId ? `/admin/accounts/${targetAccountId}` : "/admin/accounts");
}
