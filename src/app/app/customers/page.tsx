import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";
import { CustomersList } from "@/components/customers/customers-list";

export const metadata = {
  title: "Customers — BillYours",
};

interface CustomersPageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function CustomersPage(props: CustomersPageProps) {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;
  const searchParams = await props.searchParams;
  const search = searchParams.search?.trim() || "";
  const searchPattern = `%${search}%`;

  // Efficient scoped aggregation query (avoids N+1)
  const customers = await sql`
    SELECT
      c.id,
      c.name,
      c.phone,
      c.normalized_phone,
      c.email,
      c.notes,
      c.created_at,
      COUNT(b.id)::int as total_bills,
      COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.grand_total ELSE 0 END), 0)::numeric as total_spent,
      MAX(b.completed_at) as last_bill_at
    FROM customers c
    LEFT JOIN bills b ON c.id = b.customer_id AND b.account_id = ${accountId}
    WHERE c.account_id = ${accountId}
      AND c.archived_at IS NULL
      AND (${search === ""} OR c.name ILIKE ${searchPattern} OR c.phone ILIKE ${searchPattern} OR c.normalized_phone ILIKE ${searchPattern})
    GROUP BY c.id
    ORDER BY total_spent DESC, c.name ASC;
  `;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
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
      />
    </div>
  );
}
