import { cookies } from "next/headers";
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

export async function getCurrentSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);

  const sessionRows = await sql`
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
      u.role as u_role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
    LIMIT 1;
  `;

  if (sessionRows.length === 0) {
    return null;
  }

  const row = sessionRows[0];
  let activeAccountId = row.active_account_id;

  // If no active account is set on the session, find the first business account membership
  if (!activeAccountId) {
    const mem = await sql`
      SELECT account_id FROM account_memberships
      WHERE user_id = ${row.user_id}
      ORDER BY created_at ASC
      LIMIT 1;
    `;
    if (mem.length > 0) {
      activeAccountId = mem[0].account_id;
      // Persist active account to session
      await sql`
        UPDATE sessions SET active_account_id = ${activeAccountId} WHERE id = ${row.session_id}
      `;
    }
  }

  let accountData: SessionData["account"] = null;
  let membershipRole: SessionData["membershipRole"] = null;

  if (activeAccountId) {
    const accRows = await sql`
      SELECT
        id, business_name, owner_name, business_type, business_email, business_phone,
        address, state, currency, timezone, invoice_prefix, receipt_preference,
        default_tax_rate, default_tax_label, status, subscription_status,
        subscription_plan, trial_starts_at, trial_ends_at,
        subscription_starts_at, subscription_ends_at
      FROM business_accounts
      WHERE id = ${activeAccountId}
      LIMIT 1;
    `;

    if (accRows.length > 0) {
      const a = accRows[0];
      accountData = {
        id: a.id,
        businessName: a.business_name,
        ownerName: a.owner_name,
        businessType: a.business_type,
        businessEmail: a.business_email,
        businessPhone: a.business_phone,
        address: a.address,
        state: a.state,
        currency: a.currency || "INR",
        timezone: a.timezone || "Asia/Kolkata",
        invoicePrefix: a.invoice_prefix || "BY",
        receiptPreference: a.receipt_preference || "thermal",
        defaultTaxRate: a.default_tax_rate,
        defaultTaxLabel: a.default_tax_label || "GST",
        status: a.status as "ACTIVE" | "SUSPENDED" | "ARCHIVED",
        subscriptionStatus: a.subscription_status as "TRIAL" | "ACTIVE" | "EXPIRED",
        subscriptionPlan: a.subscription_plan as "MONTHLY" | "YEARLY" | null,
        trialStartsAt: new Date(a.trial_starts_at),
        trialEndsAt: new Date(a.trial_ends_at),
        subscriptionStartsAt: a.subscription_starts_at ? new Date(a.subscription_starts_at) : null,
        subscriptionEndsAt: a.subscription_ends_at ? new Date(a.subscription_ends_at) : null,
      };

      // Check membership
      const memRows = await sql`
        SELECT role FROM account_memberships
        WHERE account_id = ${activeAccountId} AND user_id = ${row.user_id}
        LIMIT 1;
      `;
      if (memRows.length > 0) {
        membershipRole = memRows[0].role as "OWNER" | "STAFF";
      } else if (row.u_role === "ADMIN") {
        membershipRole = "OWNER"; // Admin has owner privileges when viewing
      }
    }
  }

  let adminUser: SessionData["adminUser"] = null;
  if (row.impersonated_by_admin_id) {
    const adminRows = await sql`
      SELECT id, name, email FROM users WHERE id = ${row.impersonated_by_admin_id} LIMIT 1;
    `;
    if (adminRows.length > 0) {
      adminUser = {
        id: adminRows[0].id,
        name: adminRows[0].name,
        email: adminRows[0].email,
      };
    }
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
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}
