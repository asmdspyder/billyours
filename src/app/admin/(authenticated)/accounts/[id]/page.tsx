import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth";
import { sql } from "@/db";
import { AccountManagementView } from "@/components/admin/account-management-view";

interface AdminAccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminAccountDetailPage(props: AdminAccountDetailPageProps) {
  await requirePlatformAdmin();
  const params = await props.params;
  const accountId = params.id;

  const accounts = await sql`
    SELECT
      id,
      business_name,
      owner_name,
      business_email,
      business_phone,
      address,
      state,
      business_type,
      currency,
      timezone,
      status,
      subscription_status,
      subscription_plan,
      trial_starts_at,
      trial_ends_at,
      subscription_starts_at,
      subscription_ends_at,
      created_at,
      archived_at
    FROM business_accounts
    WHERE id = ${accountId}
    LIMIT 1;
  `;

  if (accounts.length === 0) {
    notFound();
  }

  const account = accounts[0];

  // Fetch recent audit logs for this account
  const auditLogs = await sql`
    SELECT
      l.id,
      l.action,
      l.details,
      l.created_at,
      u.name as admin_name,
      u.email as admin_email
    FROM admin_audit_logs l
    LEFT JOIN users u ON l.admin_user_id = u.id
    WHERE l.target_account_id = ${accountId}
    ORDER BY l.created_at DESC
    LIMIT 10;
  `;

  // Fetch account stats
  const stats = await sql`
    SELECT
      COUNT(b.id)::int as total_bills,
      COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.grand_total ELSE 0 END), 0)::numeric as total_sales,
      COUNT(DISTINCT c.id)::int as total_customers,
      COUNT(DISTINCT i.id)::int as total_items
    FROM business_accounts acc
    LEFT JOIN bills b ON acc.id = b.account_id
    LEFT JOIN customers c ON acc.id = c.account_id AND c.archived_at IS NULL
    LEFT JOIN items i ON acc.id = i.account_id AND i.archived_at IS NULL
    WHERE acc.id = ${accountId}
    GROUP BY acc.id;
  `;

  const accStats = stats[0] || {
    total_bills: 0,
    total_sales: 0,
    total_customers: 0,
    total_items: 0,
  };

  return (
    <AccountManagementView
      account={{
        id: account.id,
        businessName: account.business_name,
        ownerName: account.owner_name,
        businessEmail: account.business_email,
        businessPhone: account.business_phone,
        address: account.address,
        state: account.state,
        businessType: account.business_type,
        status: account.status,
        subscriptionStatus: account.subscription_status,
        subscriptionPlan: account.subscription_plan,
        trialEndsAt: new Date(account.trial_ends_at).toISOString(),
        subscriptionEndsAt: account.subscription_ends_at
          ? new Date(account.subscription_ends_at).toISOString()
          : null,
        createdAt: new Date(account.created_at).toLocaleDateString("en-IN"),
        archivedAt: account.archived_at
          ? new Date(account.archived_at).toLocaleDateString("en-IN")
          : null,
      }}
      stats={{
        totalBills: Number(accStats.total_bills),
        totalSales: Number(accStats.total_sales).toFixed(2),
        totalCustomers: Number(accStats.total_customers),
        totalItems: Number(accStats.total_items),
      }}
      auditLogs={auditLogs.map((log: any) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        adminName: log.admin_name || "Admin",
        createdAt: new Date(log.created_at).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      }))}
    />
  );
}
