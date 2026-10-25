import { redirect } from "next/navigation";
import { getCurrentSession, SessionData } from "./session";
import { sql } from "@/db";
import crypto from "crypto";

export class AuthorizationError extends Error {
  constructor(message: string, public code: string = "FORBIDDEN") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Ensures user is logged in. Redirects to /login if not.
 */
export async function requireAuthenticatedUser(): Promise<SessionData> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Ensures user has an active business account context.
 */
export async function requireBusinessAccount(): Promise<
  SessionData & { account: NonNullable<SessionData["account"]> }
> {
  const session = await requireAuthenticatedUser();
  if (!session.account) {
    redirect("/signup");
  }

  if (session.account.status === "SUSPENDED") {
    throw new AuthorizationError(
      "Your business account has been suspended by the platform administrator. Please contact support.",
      "ACCOUNT_SUSPENDED"
    );
  }

  if (session.account.status === "ARCHIVED") {
    throw new AuthorizationError(
      "This business account has been archived and is no longer accessible.",
      "ACCOUNT_ARCHIVED"
    );
  }

  return session as SessionData & { account: NonNullable<SessionData["account"]> };
}

/**
 * Ensures user is an owner of the business account.
 */
export async function requireAccountOwner(): Promise<
  SessionData & { account: NonNullable<SessionData["account"]> }
> {
  const session = await requireBusinessAccount();
  if (session.membershipRole !== "OWNER" && session.user.role !== "ADMIN") {
    throw new AuthorizationError("Only the business owner can perform this action.", "OWNER_REQUIRED");
  }
  return session;
}

/**
 * Centralized subscription check.
 * Checks if account has an active trial or paid subscription.
 * When expired, allows read-only access to view and print, but blocks mutations (new bills, item edits, customer edits).
 */
export function checkSubscriptionStatus(account: NonNullable<SessionData["account"]>): {
  isActive: boolean;
  isExpired: boolean;
  status: "TRIAL" | "ACTIVE" | "EXPIRED";
  daysRemaining: number;
  message?: string;
} {
  const now = new Date();

  // If paid subscription
  if (account.subscriptionStatus === "ACTIVE") {
    if (account.subscriptionEndsAt && account.subscriptionEndsAt < now) {
      return {
        isActive: false,
        isExpired: true,
        status: "EXPIRED",
        daysRemaining: 0,
        message: "Your subscription has expired. Existing bills are preserved in read-only mode.",
      };
    }
    const daysRemaining = account.subscriptionEndsAt
      ? Math.ceil((account.subscriptionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 365;
    return {
      isActive: true,
      isExpired: false,
      status: "ACTIVE",
      daysRemaining,
    };
  }

  // If in trial
  if (account.subscriptionStatus === "TRIAL") {
    if (account.trialEndsAt < now) {
      return {
        isActive: false,
        isExpired: true,
        status: "EXPIRED",
        daysRemaining: 0,
        message: "Your 7-day free trial has expired. Historical bills and records are available in read-only mode.",
      };
    }
    const daysRemaining = Math.max(
      0,
      Math.ceil((account.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      isActive: true,
      isExpired: false,
      status: "TRIAL",
      daysRemaining,
    };
  }

  return {
    isActive: false,
    isExpired: true,
    status: "EXPIRED",
    daysRemaining: 0,
    message: "Subscription is not active.",
  };
}

/**
 * Requires that the current business account has an active trial or subscription for writes.
 */
export async function requireActiveSubscription(): Promise<
  SessionData & { account: NonNullable<SessionData["account"]> }
> {
  const session = await requireBusinessAccount();
  const sub = checkSubscriptionStatus(session.account);

  if (!sub.isActive) {
    throw new AuthorizationError(
      sub.message || "Your trial or subscription has expired. New bills cannot be created until access is restored.",
      "SUBSCRIPTION_EXPIRED"
    );
  }

  return session;
}

/**
 * Requires platform administrator role.
 */
export async function requirePlatformAdmin(): Promise<SessionData> {
  const session = await getCurrentSession();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }
  return session;
}

/**
 * Enforces that a given accountId belongs to the authenticated user's session or the user is an admin.
 */
export async function requireTenantAccess(accountId: string): Promise<SessionData> {
  const session = await requireAuthenticatedUser();
  if (session.user.role === "ADMIN") {
    return session;
  }
  if (!session.account || session.account.id !== accountId) {
    throw new AuthorizationError("Access denied to requested tenant data.", "CROSS_TENANT_FORBIDDEN");
  }
  return session;
}

/**
 * Audits admin actions to ensure full compliance and traceability.
 */
export async function recordAdminAuditLog(
  adminUserId: string,
  targetAccountId: string | null,
  action: string,
  details?: Record<string, any> | string,
  impersonationSessionId?: string | null
): Promise<void> {
  const logId = "aud_" + crypto.randomBytes(8).toString("hex");
  const detailsStr = typeof details === "object" ? JSON.stringify(details) : details || null;

  await sql`
    INSERT INTO admin_audit_logs (id, admin_user_id, target_account_id, action, details, impersonation_session_id, created_at)
    VALUES (${logId}, ${adminUserId}, ${targetAccountId}, ${action}, ${detailsStr}, ${impersonationSessionId || null}, NOW())
  `;
}
