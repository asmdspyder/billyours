import { cookies } from "next/headers";
import { cache } from "react";
import crypto from "crypto";
import { sql } from "@/db";

export const SESSION_COOKIE_NAME = "billyours_session";
const SESSION_TTL_DAYS = 30;

export interface SessionData {
  session: {
    id: string;
    tokenHash: string;
    activeAccountId: string | null;
    impersonatedByAdminId: string | null;
    expiresAt: Date;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
  };
  account: {
    id: string;
    businessName: string;
    ownerName: string;
    businessType: string;
    businessEmail: string | null;
    businessPhone: string | null;
    address: string | null;
    state: string | null;
    currency: string;
    timezone: string;
    invoicePrefix: string;
    receiptPreference: string;
    defaultTaxRate: string | null;
    defaultTaxLabel: string | null;
    gstin: string | null;
    gstRegistrationType: "REGULAR" | "COMPOSITION" | "UNREGISTERED";
    pan: string | null;
    fssai: string | null;
    website: string | null;
    facebook: string | null;
    instagram: string | null;
    googleReviewLink: string | null;
    status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
    subscriptionStatus: "TRIAL" | "ACTIVE" | "EXPIRED";
    subscriptionPlan: "MONTHLY" | "YEARLY" | null;
    trialStartsAt: Date;
    trialEndsAt: Date;
    subscriptionStartsAt: Date | null;
    subscriptionEndsAt: Date | null;
  } | null;
  membershipRole: "OWNER" | "STAFF" | null;
  isImpersonating: boolean;
  adminUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  activeAccountId?: string | null,
  impersonatedByAdminId?: string | null
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const sessionId = "ses_" + crypto.randomBytes(8).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO sessions (id, user_id, token_hash, active_account_id, impersonated_by_admin_id, expires_at, created_at)
    VALUES (${sessionId}, ${userId}, ${tokenHash}, ${activeAccountId || null}, ${impersonatedByAdminId || null}, ${expiresAt.toISOString()}, NOW());
  `;

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export const getCurrentSession = cache(async (): Promise<SessionData | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);

  // Single unified SQL query combining session, user, default account fallback, business account, membership, and admin lookup
  const rows = await sql`
    SELECT
      s.id as session_id,
      s.user_id,
      s.token_hash,
      s.active_account_id,
      s.impersonated_by_admin_id,
      s.expires_at,
      u.id as u_id,
      u.name as u_name,
      u.email as u_email,
      u.role as u_role,
      COALESCE(s.active_account_id, default_mem.account_id) as resolved_account_id,
      ba.id as ba_id,
      ba.business_name,
      ba.owner_name,
      ba.business_type,
      ba.business_email,
      ba.business_phone,
      ba.address as ba_address,
      ba.state as ba_state,
      ba.currency as ba_currency,
      ba.timezone as ba_timezone,
      ba.invoice_prefix as ba_invoice_prefix,
      ba.receipt_preference as ba_receipt_preference,
      ba.default_tax_rate,
      ba.default_tax_label,
      ba.gstin,
      ba.gst_registration_type,
      ba.pan,
      ba.fssai,
      ba.website,
      ba.facebook,
      ba.instagram,
      ba.google_review_link,
      ba.status as ba_status,
      ba.subscription_status as ba_subscription_status,
      ba.subscription_plan as ba_subscription_plan,
      ba.trial_starts_at,
      ba.trial_ends_at,
      ba.subscription_starts_at,
      ba.subscription_ends_at,
      m.role as membership_role,
      admin_u.id as admin_id,
      admin_u.name as admin_name,
      admin_u.email as admin_email
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT account_id FROM account_memberships
      WHERE user_id = s.user_id
      ORDER BY created_at ASC
      LIMIT 1
    ) default_mem ON true
    LEFT JOIN business_accounts ba ON ba.id = COALESCE(s.active_account_id, default_mem.account_id)
    LEFT JOIN account_memberships m ON m.account_id = ba.id AND m.user_id = s.user_id
    LEFT JOIN users admin_u ON s.impersonated_by_admin_id = admin_u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
    LIMIT 1;
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const activeAccountId = row.resolved_account_id;

  // If active_account_id was unset on the session record, persist the resolved account
  if (!row.active_account_id && activeAccountId) {
    sql`UPDATE sessions SET active_account_id = ${activeAccountId} WHERE id = ${row.session_id}`.catch(console.error);
  }

  let accountData: SessionData["account"] = null;
  if (row.ba_id) {
    accountData = {
      id: row.ba_id,
      businessName: row.business_name,
      ownerName: row.owner_name,
      businessType: row.business_type,
      businessEmail: row.business_email,
      businessPhone: row.business_phone,
      address: row.ba_address,
      state: row.ba_state,
      currency: row.ba_currency || "INR",
      timezone: row.ba_timezone || "Asia/Kolkata",
      invoicePrefix: row.ba_invoice_prefix || "BY",
      receiptPreference: row.ba_receipt_preference || "thermal",
      defaultTaxRate: row.default_tax_rate,
      defaultTaxLabel: row.default_tax_label || "GST",
      gstin: row.gstin || null,
      gstRegistrationType: (row.gst_registration_type || "REGULAR") as "REGULAR" | "COMPOSITION" | "UNREGISTERED",
      pan: row.pan || null,
      fssai: row.fssai || null,
      website: row.website || null,
      facebook: row.facebook || null,
      instagram: row.instagram || null,
      googleReviewLink: row.google_review_link || null,
      status: row.ba_status as "ACTIVE" | "SUSPENDED" | "ARCHIVED",
      subscriptionStatus: row.ba_subscription_status as "TRIAL" | "ACTIVE" | "EXPIRED",
      subscriptionPlan: row.ba_subscription_plan as "MONTHLY" | "YEARLY" | null,
      trialStartsAt: new Date(row.trial_starts_at),
      trialEndsAt: new Date(row.trial_ends_at),
      subscriptionStartsAt: row.subscription_starts_at ? new Date(row.subscription_starts_at) : null,
      subscriptionEndsAt: row.subscription_ends_at ? new Date(row.subscription_ends_at) : null,
    };
  }

  let membershipRole: SessionData["membershipRole"] = null;
  if (row.membership_role) {
    membershipRole = row.membership_role as "OWNER" | "STAFF";
  } else if (row.u_role === "ADMIN") {
    membershipRole = "OWNER";
  }

  let adminUser: SessionData["adminUser"] = null;
  if (row.admin_id) {
    adminUser = {
      id: row.admin_id,
      name: row.admin_name,
      email: row.admin_email,
    };
  }

  return {
    session: {
      id: row.session_id,
      tokenHash: row.token_hash,
      activeAccountId,
      impersonatedByAdminId: row.impersonated_by_admin_id,
      expiresAt: new Date(row.expires_at),
    },
    user: {
      id: row.u_id,
      name: row.u_name,
      email: row.u_email,
      role: row.u_role as "USER" | "ADMIN",
    },
    account: accountData,
    membershipRole,
    isImpersonating: Boolean(row.impersonated_by_admin_id),
    adminUser,
  };
});

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}
