import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";
import { requireBusinessAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim() || "";
  const payment = (params.get("payment") || "")
    .split(",")
    .filter((value) => ["CASH", "UPI", "CARD"].includes(value));
  const status = (params.get("status") || "")
    .split(",")
    .filter((value) => ["COMPLETED", "CANCELLED"].includes(value));
  const startDate = isValidDate(params.get("startDate")) ? params.get("startDate")! : "";
  const endDate = isValidDate(params.get("endDate")) ? params.get("endDate")! : "";
  const dateRangeIsValid = !startDate || !endDate || startDate <= endDate;
  const searchPattern = `%${search}%`;
  const pageSize = 15;

  const [countResult, bills] = await Promise.all([
    sql`
      SELECT COUNT(*)::int as count
      FROM bills b
      LEFT JOIN customers c ON c.id = b.customer_id AND c.account_id = b.account_id
      WHERE b.account_id = ${accountId}
        AND (${search === ""} OR b.bill_number ILIKE ${searchPattern} OR b.customer_name_snapshot ILIKE ${searchPattern} OR b.customer_phone_snapshot ILIKE ${searchPattern} OR c.name ILIKE ${searchPattern} OR c.phone ILIKE ${searchPattern})
        AND (${payment.length === 0} OR b.payment_method = ANY(${payment}::varchar[]))
        AND (${status.length === 0} OR b.status = ANY(${status}::varchar[]))
        AND (${!dateRangeIsValid || !startDate} OR (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date >= NULLIF(${startDate}, '')::date)
        AND (${!dateRangeIsValid || !endDate} OR (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date <= NULLIF(${endDate}, '')::date);
    `,
    sql`
      SELECT
        b.id,
        b.bill_number,
        CASE
          WHEN b.customer_name_snapshot IN ('Customer', 'Walk-in Customer')
            THEN COALESCE(c.name, b.customer_name_snapshot)
          ELSE COALESCE(b.customer_name_snapshot, c.name)
        END AS customer_name_snapshot,
        COALESCE(b.customer_phone_snapshot, c.phone) AS customer_phone_snapshot,
        b.grand_total,
        b.payment_status,
        b.payment_method,
        b.status,
        b.completed_at
      FROM bills b
      LEFT JOIN customers c ON c.id = b.customer_id AND c.account_id = b.account_id
      WHERE b.account_id = ${accountId}
        AND (${search === ""} OR b.bill_number ILIKE ${searchPattern} OR b.customer_name_snapshot ILIKE ${searchPattern} OR b.customer_phone_snapshot ILIKE ${searchPattern} OR c.name ILIKE ${searchPattern} OR c.phone ILIKE ${searchPattern})
        AND (${payment.length === 0} OR b.payment_method = ANY(${payment}::varchar[]))
        AND (${status.length === 0} OR b.status = ANY(${status}::varchar[]))
        AND (${!dateRangeIsValid || !startDate} OR (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date >= NULLIF(${startDate}, '')::date)
        AND (${!dateRangeIsValid || !endDate} OR (b.completed_at AT TIME ZONE 'Asia/Kolkata')::date <= NULLIF(${endDate}, '')::date)
      ORDER BY b.completed_at DESC, b.id DESC
      LIMIT ${pageSize};
    `,
  ]);

  const totalCount = Number(countResult[0]?.count) || 0;
  return NextResponse.json({
    bills: bills.map((bill) => ({
      id: bill.id,
      billNumber: bill.bill_number,
      customerName: bill.customer_name_snapshot || "Walk-in Customer",
      customerPhone: bill.customer_phone_snapshot,
      grandTotal: Number(bill.grand_total).toFixed(2),
      paymentStatus: bill.payment_status,
      paymentMethod: bill.payment_method || "CASH",
      status: bill.status,
      completedAt: new Date(bill.completed_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }),
    })),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  });
}

function isValidDate(value: string | null): boolean {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
