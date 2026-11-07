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
    startDate?: string;
    endDate?: string;
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
  const paymentOptions = ["CASH", "UPI", "CARD"];
  const statusOptions = ["COMPLETED", "CANCELLED"];
  const payment = (searchParams.payment || "")
    .split(",")
    .filter((value) => paymentOptions.includes(value));
  const status = (searchParams.status || "")
    .split(",")
    .filter((value) => statusOptions.includes(value));
  const isValidDate = (value?: string) =>
    Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
  const startDate = isValidDate(searchParams.startDate) ? searchParams.startDate! : "";
  const endDate = isValidDate(searchParams.endDate) ? searchParams.endDate! : "";
  const dateRangeIsValid = !startDate || !endDate || startDate <= endDate;
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 15;
  const offset = (page - 1) * pageSize;
  const searchPattern = search ? `%${search}%` : "%";

  // Fetch page with total count in a single round-trip using window count.
  // Branching when search is empty allows PostgreSQL optimizer to execute a clean index scan without evaluation overhead.
  const bills = search
    ? await sql`
        SELECT
          b.id,
          b.bill_number,
          b.customer_id,
          CASE
            WHEN b.customer_name_snapshot IN ('Customer', 'Walk-in Customer')
              THEN COALESCE(c.name, b.customer_name_snapshot)
            ELSE COALESCE(b.customer_name_snapshot, c.name)
          END AS customer_name_snapshot,
          COALESCE(b.customer_phone_snapshot, c.phone) AS customer_phone_snapshot,
          b.subtotal,
          b.discount_amount,
          b.tax_amount,
          b.grand_total,
          b.payment_status,
          b.payment_method,
          b.status,
          b.completed_at,
          b.created_at,
          count(*) OVER()::int as filtered_total_count
        FROM bills b
        LEFT JOIN customers c ON c.id = b.customer_id AND c.account_id = b.account_id
        WHERE b.account_id = ${accountId}
          AND (b.bill_number ILIKE ${searchPattern} OR b.customer_name_snapshot ILIKE ${searchPattern} OR b.customer_phone_snapshot ILIKE ${searchPattern})
          AND (${payment.length === 0} OR b.payment_method = ANY(${payment}::varchar[]))
          AND (${status.length === 0} OR b.status = ANY(${status}::varchar[]))
          AND (${!dateRangeIsValid || !startDate} OR (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date >= NULLIF(${startDate}, '')::date)
          AND (${!dateRangeIsValid || !endDate} OR (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date <= NULLIF(${endDate}, '')::date)
        ORDER BY b.completed_at DESC, b.id DESC
        LIMIT ${pageSize}
        OFFSET ${offset};
      `
    : await sql`
        SELECT
          b.id,
          b.bill_number,
          b.customer_id,
          CASE
            WHEN b.customer_name_snapshot IN ('Customer', 'Walk-in Customer')
              THEN COALESCE(c.name, b.customer_name_snapshot)
            ELSE COALESCE(b.customer_name_snapshot, c.name)
          END AS customer_name_snapshot,
          COALESCE(b.customer_phone_snapshot, c.phone) AS customer_phone_snapshot,
          b.subtotal,
          b.discount_amount,
          b.tax_amount,
          b.grand_total,
          b.payment_status,
          b.payment_method,
          b.status,
          b.completed_at,
          b.created_at,
          count(*) OVER()::int as filtered_total_count
        FROM bills b
        LEFT JOIN customers c ON c.id = b.customer_id AND c.account_id = b.account_id
        WHERE b.account_id = ${accountId}
          AND (${payment.length === 0} OR b.payment_method = ANY(${payment}::varchar[]))
          AND (${status.length === 0} OR b.status = ANY(${status}::varchar[]))
          AND (${!dateRangeIsValid || !startDate} OR (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date >= NULLIF(${startDate}, '')::date)
          AND (${!dateRangeIsValid || !endDate} OR (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date <= NULLIF(${endDate}, '')::date)
        ORDER BY b.completed_at DESC, b.id DESC
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
            AND (${payment.length === 0} OR payment_method = ANY(${payment}::varchar[]))
            AND (${status.length === 0} OR status = ANY(${status}::varchar[]))
            AND (${!dateRangeIsValid || !startDate} OR (completed_at AT TIME ZONE 'Asia/Kolkata')::date >= NULLIF(${startDate}, '')::date)
            AND (${!dateRangeIsValid || !endDate} OR (completed_at AT TIME ZONE 'Asia/Kolkata')::date <= NULLIF(${endDate}, '')::date);
        `
      : await sql`
          SELECT COUNT(*)::int as count FROM bills
          WHERE account_id = ${accountId}
            AND (${payment.length === 0} OR payment_method = ANY(${payment}::varchar[]))
            AND (${status.length === 0} OR status = ANY(${status}::varchar[]))
            AND (${!dateRangeIsValid || !startDate} OR (completed_at AT TIME ZONE 'Asia/Kolkata')::date >= NULLIF(${startDate}, '')::date)
            AND (${!dateRangeIsValid || !endDate} OR (completed_at AT TIME ZONE 'Asia/Kolkata')::date <= NULLIF(${endDate}, '')::date);
        `;
    totalCount = countRes[0]?.count || 0;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="no-scrollbar mx-auto h-full w-full max-w-[1360px] min-w-0 overflow-y-auto px-3 py-4 sm:px-5 md:px-6 lg:px-8 xl:px-10 pb-8">
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
        currentStartDate={startDate}
        currentEndDate={endDate}
        businessName={session.account.businessName}
        googleReviewLink={session.account.googleReviewLink}
      />
    </div>
  );
}
