import { requireBusinessAccount } from "@/lib/auth";
import { sql } from "@/db";
import { BillingWorkspace } from "@/components/billing/billing-workspace";

export const metadata = {
  title: "New Bill — BillYours",
};

export default async function BillingPage() {
  const session = await requireBusinessAccount();
  const accountId = session.account.id;

  // Fetch active catalog items, staff members, and distinct categories concurrently
  const [activeItems, activeStaff, distinctCategories] = await Promise.all([
    sql`
      SELECT id, name, category, unit_label, unit_price, tax_treatment, gst_rate, price_type, hsn_sac_code
      FROM items
      WHERE account_id = ${accountId} AND is_active = true AND archived_at IS NULL
      ORDER BY name ASC
      LIMIT 500;
    `,
    sql`
      SELECT id, name, is_default
      FROM staff_members
      WHERE account_id = ${accountId} AND is_active = true
      ORDER BY is_default DESC, name ASC;
    `,
    sql`
      SELECT DISTINCT category
      FROM items
      WHERE account_id = ${accountId} AND is_active = true AND archived_at IS NULL AND category IS NOT NULL
      ORDER BY category ASC;
    `,
  ]);

  const categories = distinctCategories.map((c: any) => c.category).filter(Boolean) as string[];

  return (
    <BillingWorkspace
      business={session.account}
      initialItems={activeItems.map((it) => ({
        id: it.id,
        name: it.name,
        category: it.category || null,
        unitLabel: it.unit_label || "",
        unitPrice: Number(it.unit_price),
        taxTreatment: (it.tax_treatment || "TAXABLE") as "TAXABLE" | "EXEMPT" | "NIL_RATED" | "NON_GST",
        gstRate: Number(it.gst_rate || 0),
        priceType: (it.price_type || "EXCLUSIVE") as "EXCLUSIVE" | "INCLUSIVE",
        hsnSacCode: it.hsn_sac_code || null,
      }))}
      categories={categories}
      staffList={activeStaff.map((s: any) => ({
        id: s.id,
        name: s.name,
        isDefault: Boolean(s.is_default),
      }))}
    />
  );
}
