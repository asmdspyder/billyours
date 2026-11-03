import { requireBusinessAccount, checkSubscriptionStatus } from "@/lib/auth";
import { sql } from "@/db";
import { BillsList } from "@/components/bills/bills-list";
import { SubscriptionExpiredScreen } from "@/components/subscription/subscription-expired-screen";

export const metadata = {
  title: "Bill History — BillYours",
};

interface BillsPageProps {
  searchParams: Promise<{
    search?: string;
    payment?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function BillsPage(props: BillsPageProps) {
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
  const payment = searchParams.payment || "ALL";
  const status = searchParams.status || "ALL";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 15;
  const offset = (page - 1) * pageSize;
  const searchPattern = search ? `%${search}%` : "%";

  // Fetch page with total count in a single round-trip using window count.
  // Branching when search is empty allows PostgreSQL optimizer to execute a clean index scan without evaluation overhead.
  const bills = search
    ? await sql`
        SELECT
          id,
          bill_number,
          customer_id,
          customer_name_snapshot,
          customer_phone_snapshot,
          subtotal,
          discount_amount,
          tax_amount,
          grand_total,
          payment_status,
          payment_method,
          status,
          completed_at,
          created_at,
          count(*) OVER()::int as filtered_total_count
        FROM bills
        WHERE account_id = ${accountId}
          AND (bill_number ILIKE ${searchPattern} OR customer_name_snapshot ILIKE ${searchPattern} OR customer_phone_snapshot ILIKE ${searchPattern})
          AND (${payment === "ALL"} OR payment_method = ${payment})
          AND (${status === "ALL"} OR status = ${status})
        ORDER BY completed_at DESC, id DESC
        LIMIT ${pageSize}
        OFFSET ${offset};
      `
    : await sql`
        SELECT
          id,
          bill_number,
          customer_id,
          customer_name_snapshot,
          customer_phone_snapshot,
          subtotal,
          discount_amount,
          tax_amount,
          grand_total,
          payment_status,
          payment_method,
          status,
          completed_at,
          created_at,
          count(*) OVER()::int as filtered_total_count
        FROM bills
        WHERE account_id = ${accountId}
          AND (${payment === "ALL"} OR payment_method = ${payment})
          AND (${status === "ALL"} OR status = ${status})
        ORDER BY completed_at DESC, id DESC
        LIMIT ${pageSize}
        OFFSET ${offset};
      `;

  let totalCount = 0;
  if (bills.length > 0) {
    totalCount = Number(bills[0].filtered_total_count) || 0;
  } else if (page > 1) {
    // If user navigated to an empty high page, fetch total count to render pagination cleanly
    const countRes = search
      ? await sql`
          SELECT COUNT(*)::int as count FROM bills
          WHERE account_id = ${accountId}
            AND (bill_number ILIKE ${searchPattern} OR customer_name_snapshot ILIKE ${searchPattern} OR customer_phone_snapshot ILIKE ${searchPattern})
            AND (${payment === "ALL"} OR payment_method = ${payment})
            AND (${status === "ALL"} OR status = ${status});
        `
      : await sql`
          SELECT COUNT(*)::int as count FROM bills
          WHERE account_id = ${accountId}
            AND (${payment === "ALL"} OR payment_method = ${payment})
            AND (${status === "ALL"} OR status = ${status});
        `;
    totalCount = countRes[0]?.count || 0;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="overflow-y-auto h-full p-4 md:p-6 max-w-6xl mx-auto space-y-4 pb-8">
      <BillsList
        bills={bills.map((b) => ({
          id: b.id,
          billNumber: b.bill_number,
          customerName: b.customer_name_snapshot || "Walk-in Customer",
          customerPhone: b.customer_phone_snapshot,
          grandTotal: Number(b.grand_total).toFixed(2),
          paymentStatus: b.payment_status as "PAID" | "UNPAID",
          paymentMethod: b.payment_method || "CASH",
          status: b.status as "COMPLETED" | "CANCELLED",
          completedAt: new Date(b.completed_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata",
          }),
        }))}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        currentSearch={search}
        currentPayment={payment}
        currentStatus={status}
      />
    </div>
  );
}
