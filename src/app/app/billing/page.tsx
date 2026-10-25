import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";
import { BillingWorkspace } from "@/components/billing/billing-workspace";

export const metadata = {
  title: "New Bill — BillYours",
};

export default async function BillingPage() {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;

  // Fetch active catalog items for this tenant
  const activeItems = await sql`
    SELECT id, name, category, unit_label, unit_price
    FROM items
    WHERE account_id = ${accountId} AND is_active = true
    ORDER BY name ASC;
  `;

  // Fetch unique categories
  const categories = Array.from(
    new Set(activeItems.map((it) => it.category).filter(Boolean))
  ) as string[];

  return (
    <BillingWorkspace
      business={session.account}
      initialItems={activeItems.map((it) => ({
        id: it.id,
        name: it.name,
        category: it.category || null,
        unitLabel: it.unit_label || "piece",
        unitPrice: Number(it.unit_price),
      }))}
      categories={categories}
    />
  );
}
