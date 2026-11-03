import { requireBusinessAccount, checkSubscriptionStatus } from "@/lib/auth";
import { sql } from "@/db";
import { ItemsCatalog } from "@/components/catalog/items-catalog";
import { SubscriptionExpiredScreen } from "@/components/subscription/subscription-expired-screen";

export const metadata = {
  title: "Item Catalog — BillYours",
};

interface ItemsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function ItemsPage(props: ItemsPageProps) {
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
  const selectedCategory = searchParams.category?.trim() || "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  const searchPattern = `%${search}%`;

  const [categoriesResult, countResult, itemsResult] = await Promise.all([
    sql`
      SELECT DISTINCT category
      FROM items
      WHERE account_id = ${accountId}
        AND archived_at IS NULL
        AND category IS NOT NULL
      ORDER BY category ASC;
    `,
    sql`
      SELECT COUNT(*)::int as total
      FROM items
      WHERE account_id = ${accountId}
        AND archived_at IS NULL
        AND (${search === ""} OR name ILIKE ${searchPattern} OR category ILIKE ${searchPattern} OR hsn_sac_code ILIKE ${searchPattern})
        AND (${selectedCategory === ""} OR category = ${selectedCategory});
    `,
    sql`
      SELECT
        id,
        name,
        description,
        category,
        unit_label,
        unit_price,
        tax_treatment,
        gst_rate,
        price_type,
        hsn_sac_code,
        is_active,
        created_at
      FROM items
      WHERE account_id = ${accountId}
        AND archived_at IS NULL
        AND (${search === ""} OR name ILIKE ${searchPattern} OR category ILIKE ${searchPattern} OR hsn_sac_code ILIKE ${searchPattern})
        AND (${selectedCategory === ""} OR category = ${selectedCategory})
      ORDER BY is_active DESC, name ASC
      LIMIT ${pageSize}
      OFFSET ${offset};
    `,
  ]);

  const totalCount = countResult[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const categories = categoriesResult.map((r: any) => r.category).filter(Boolean) as string[];

  return (
    <div className="overflow-y-auto h-full">
      <ItemsCatalog
        business={session.account}
        initialItems={itemsResult.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          category: it.category,
          unitLabel: it.unit_label || "",
          unitPrice: Number(it.unit_price),
          taxTreatment: (it.tax_treatment || "TAXABLE") as "TAXABLE" | "EXEMPT" | "NIL_RATED" | "NON_GST",
          gstRate: Number(it.gst_rate || 0),
          priceType: (it.price_type || "EXCLUSIVE") as "EXCLUSIVE" | "INCLUSIVE",
          hsnSacCode: it.hsn_sac_code || null,
          isActive: Boolean(it.is_active),
          createdAt: it.created_at,
        }))}
        serverCategories={categories}
        pagination={{
          page,
          pageSize,
          totalPages,
          totalCount,
          currentSearch: search,
          currentCategory: selectedCategory,
        }}
      />
    </div>
  );
}

