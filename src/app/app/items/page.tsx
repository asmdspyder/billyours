import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";
import { ItemsCatalog } from "@/components/catalog/items-catalog";

export const metadata = {
  title: "Item Catalog — BillYours",
};

export default async function ItemsPage() {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;

  const allItems = await sql`
    SELECT
      id,
      name,
      description,
      category,
      unit_label,
      unit_price,
      is_active,
      created_at
    FROM items
    WHERE account_id = ${accountId}
      AND archived_at IS NULL
    ORDER BY is_active DESC, name ASC;
  `;

  return (
    <div className="overflow-y-auto h-full">
      <ItemsCatalog
        initialItems={allItems.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          category: it.category,
          unitLabel: it.unit_label || "piece",
          unitPrice: Number(it.unit_price),
          isActive: Boolean(it.is_active),
          createdAt: it.created_at,
        }))}
      />
    </div>
  );
}
