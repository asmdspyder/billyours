import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db";
import { requireBusinessAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;
  const search = request.nextUrl.searchParams.get("search")?.trim() || "";
  const searchPattern = `%${search}%`;
  const pageSize = 25;

  const [countResult, customers] = await Promise.all([
    sql`
      SELECT COUNT(*)::int as total
      FROM customers
      WHERE account_id = ${accountId}
        AND archived_at IS NULL
        AND (${search === ""} OR name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern} OR normalized_phone ILIKE ${searchPattern});
    `,
    sql`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.normalized_phone,
        c.email,
        COALESCE(stats.total_bills, 0)::int as total_bills,
        COALESCE(stats.total_spent, 0)::numeric as total_spent,
        stats.last_bill_at
      FROM (
        SELECT id, name, phone, normalized_phone, email, created_at
        FROM customers
        WHERE account_id = ${accountId}
          AND archived_at IS NULL
          AND (${search === ""} OR name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern} OR normalized_phone ILIKE ${searchPattern})
        ORDER BY created_at DESC
        LIMIT ${pageSize}
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
    `,
  ]);

  const totalCount = Number(countResult[0]?.total) || 0;
  return NextResponse.json({
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone || customer.normalized_phone || "—",
      email: customer.email,
      totalBills: Number(customer.total_bills),
      totalSpent: Number(customer.total_spent).toFixed(2),
      lastVisit: customer.last_bill_at
        ? new Date(customer.last_bill_at).toLocaleDateString("en-IN", {
            dateStyle: "medium",
            timeZone: "Asia/Kolkata",
          })
        : "No bills yet",
    })),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  });
}
