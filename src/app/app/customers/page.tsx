import { requireBusinessAccount, checkSubscriptionStatus } from "@/lib/auth";
import { sql } from "@/db";
import { CustomersList } from "@/components/customers/customers-list";
import { SubscriptionExpiredScreen } from "@/components/subscription/subscription-expired-screen";

export const metadata = {
  title: "Customers — BillYours",
};

interface CustomersPageProps {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

export default async function CustomersPage(props: CustomersPageProps) {
  const session = await requireBusinessAccount();
  const subStatus = checkSubscriptionStatus(session.account);

  if (subStatus.isExpired && !session.isImpersonating) {
    return (
      <SubscriptionExpiredScreen
        businessName={session.account.businessName}
        ownerName={session.user.name}
        accountId={session.account.id}
      />
    );
  }

  const accountId = session.account.id;
  const searchParams = await props.searchParams;
  const search = searchParams.search?.trim() || "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  const searchPattern = `%${search}%`;

  // Total count for proper server-side pagination
  const countResult = await sql`
    SELECT COUNT(*)::int as total
    FROM customers
    WHERE account_id = ${accountId}
      AND archived_at IS NULL
      AND (${search === ""} OR name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern} OR normalized_phone ILIKE ${searchPattern});
  `;
  const totalCount = countResult[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // High-performance bounded query with LATERAL aggregation and proper pagination
  const customers = await sql`
    SELECT
      c.id,
      c.name,
      c.phone,
      c.normalized_phone,
      c.email,
      c.notes,
      c.created_at,
      COALESCE(stats.total_bills, 0)::int as total_bills,
      COALESCE(stats.total_spent, 0)::numeric as total_spent,
      stats.last_bill_at
    FROM (
      SELECT id, name, phone, normalized_phone, email, notes, created_at
      FROM customers
      WHERE account_id = ${accountId}
        AND archived_at IS NULL
        AND (${search === ""} OR name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern} OR normalized_phone ILIKE ${searchPattern})
      ORDER BY created_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    ) c
    LEFT JOIN LATERAL (
      SELECT
        COUNT(id)::int as total_bills,
        COALESCE(SUM(grand_total), 0)::numeric as total_spent,
        MAX(completed_at) as last_bill_at
      FROM bills
      WHERE customer_id = c.id
        AND account_id = ${accountId}
        AND status = 'COMPLETED'
    ) stats ON true
    ORDER BY total_spent DESC, c.name ASC;
  `;

  return (
    <div className="no-scrollbar overflow-y-auto h-full p-4 md:p-6 max-w-6xl mx-auto space-y-4 pb-8">
      <CustomersList
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || c.normalized_phone || "—",
          email: c.email,
          totalBills: Number(c.total_bills),
          totalSpent: Number(c.total_spent).toFixed(2),
          lastVisit: c.last_bill_at
            ? new Date(c.last_bill_at).toLocaleDateString("en-IN", {
                dateStyle: "medium",
                timeZone: "Asia/Kolkata",
              })
            : "No bills yet",
        }))}
        currentSearch={search}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  );
}
