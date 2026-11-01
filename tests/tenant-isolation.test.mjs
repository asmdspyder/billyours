import test from "node:test";
import assert from "node:assert/strict";
import { neon, neonConfig } from "@neondatabase/serverless";
import crypto from "crypto";

const rawConnectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const connectionString = rawConnectionString.replace(/&channel_binding=require/g, "").replace(/\?channel_binding=require&?/g, "?");

neonConfig.fetchEndpoint = (h) => `https://${h}/sql`;

const originalFetch = globalThis.fetch;
neonConfig.fetchFunction = async (url, options) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await originalFetch(url, options);
      if ((response.status === 503 || response.status === 504) && attempts < 2) {
        attempts++;
        await new Promise((r) => setTimeout(r, 400 * attempts));
        continue;
      }
      return response;
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempts));
    }
  }
  return originalFetch(url, options);
};

const sql = neon(connectionString);

function generateId(prefix = "tst") {
  return prefix + "_" + crypto.randomBytes(8).toString("hex");
}

test("Tenant isolation: cross-tenant data access is strictly prevented", async () => {
  const tenantAId = generateId("acc_A");
  const tenantBId = generateId("acc_B");

  try {
    // 1. Create two separate tenants
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO business_accounts (id, business_name, owner_name, trial_starts_at, trial_ends_at, created_at, updated_at)
      VALUES
        (${tenantAId}, 'Tenant Alpha Mart', 'Owner Alpha', NOW(), ${trialEnds.toISOString()}, NOW(), NOW()),
        (${tenantBId}, 'Tenant Beta Salon', 'Owner Beta', NOW(), ${trialEnds.toISOString()}, NOW(), NOW())
    `;

    // 2. Create customer and item for Tenant B
    const custBId = generateId("cst_B");
    await sql`
      INSERT INTO customers (id, account_id, name, phone, normalized_phone, created_at, updated_at)
      VALUES (${custBId}, ${tenantBId}, 'Customer B', '9999900002', '+919999900002', NOW(), NOW())
    `;

    const itemBId = generateId("itm_B");
    await sql`
      INSERT INTO items (id, account_id, name, unit_price, is_active, created_at, updated_at)
      VALUES (${itemBId}, ${tenantBId}, 'Beta Haircut', '350.00', true, NOW(), NOW())
    `;

    // 3. Create a bill for Tenant B
    const billBId = generateId("bil_B");
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, customer_id, customer_name_snapshot,
        subtotal, taxable_amount, grand_total, payment_status, completed_at, created_at, updated_at
      ) VALUES (
        ${billBId}, ${tenantBId}, 'BY-2026-999999', ${custBId}, 'Customer B',
        '350.00', '350.00', '350.00', 'PAID', NOW(), NOW(), NOW()
      )
    `;

    // 4. Verify Tenant A query scoped to account_id CANNOT see Tenant B's bill
    const billsForA = await sql`
      SELECT id FROM bills WHERE account_id = ${tenantAId} AND id = ${billBId}
    `;
    assert.equal(billsForA.length, 0, "Tenant A should not be able to query Tenant B bill");

    // 5. Verify Tenant A query scoped to account_id CANNOT see Tenant B's customer
    const customersForA = await sql`
      SELECT id FROM customers WHERE account_id = ${tenantAId} AND normalized_phone = '+919999900002'
    `;
    assert.equal(customersForA.length, 0, "Tenant A should not see Tenant B customer");

    // 6. Verify Tenant A query scoped to account_id CANNOT see Tenant B's items
    const itemsForA = await sql`
      SELECT id FROM items WHERE account_id = ${tenantAId} AND name = 'Beta Haircut'
    `;
    assert.equal(itemsForA.length, 0, "Tenant A should not see Tenant B items");

    // 7. Test scoped update rejection: Tenant A trying to update Tenant B's item fails to match rows
    const updateResult = await sql`
      UPDATE items SET unit_price = '999.00'
      WHERE id = ${itemBId} AND account_id = ${tenantAId}
      RETURNING id
    `;
    assert.equal(updateResult.length, 0, "Tenant A should not be able to modify Tenant B item");

    // 8. Test scoped cancel rejection: Tenant A trying to cancel Tenant B's bill fails to match rows
    const cancelResult = await sql`
      UPDATE bills SET status = 'CANCELLED', cancellation_reason = 'Unauthorized'
      WHERE id = ${billBId} AND account_id = ${tenantAId}
      RETURNING id
    `;
    assert.equal(cancelResult.length, 0, "Tenant A should not be able to cancel Tenant B bill");

    // 9. Relational Integrity: Database composite FK rejects cross-tenant bill_items -> bills link
    let fkBillRejected = false;
    try {
      await sql`
        INSERT INTO bill_items (
          id, account_id, bill_id, item_name_snapshot, unit_price, quantity, line_subtotal
        ) VALUES (
          ${generateId("bli_cross")}, ${tenantAId}, ${billBId}, 'Illicit Item', 100, 1, 100
        )
      `;
    } catch (fkErr) {
      fkBillRejected = fkErr.message.includes("fk_bill_items_account_bill") || fkErr.code === "23503";
    }
    assert.ok(fkBillRejected, "Composite FK fk_bill_items_account_bill must reject cross-tenant bill items");

    // 10. Relational Integrity: Database composite FK rejects cross-tenant bill_items -> items link
    const billAId = generateId("bil_A");
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, subtotal, taxable_amount, grand_total, payment_status, completed_at, created_at, updated_at
      ) VALUES (
        ${billAId}, ${tenantAId}, 'BY-2026-000001', '100.00', '100.00', '100.00', 'PAID', NOW(), NOW(), NOW()
      )
    `;

    let fkItemRejected = false;
    try {
      await sql`
        INSERT INTO bill_items (
          id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal
        ) VALUES (
          ${generateId("bli_cross2")}, ${tenantAId}, ${billAId}, ${itemBId}, 'Cross Catalog Item', 100, 1, 100
        )
      `;
    } catch (fkErr) {
      fkItemRejected = fkErr.message.includes("fk_bill_items_account_item") || fkErr.code === "23503";
    }
    assert.ok(fkItemRejected, "Composite FK fk_bill_items_account_item must reject cross-tenant item references");

    // 11. Relational Integrity: Database composite FK rejects cross-tenant bills -> customers link
    let fkCustomerRejected = false;
    try {
      await sql`
        INSERT INTO bills (
          id, account_id, bill_number, customer_id, subtotal, taxable_amount, grand_total, payment_status, completed_at, created_at, updated_at
        ) VALUES (
          ${generateId("bil_cross_cust")}, ${tenantAId}, 'BY-2026-000002', ${custBId}, '100.00', '100.00', '100.00', 'PAID', NOW(), NOW(), NOW()
        )
      `;
    } catch (fkErr) {
      fkCustomerRejected = fkErr.message.includes("fk_bills_account_customer") || fkErr.code === "23503";
    }
    assert.ok(fkCustomerRejected, "Composite FK fk_bills_account_customer must reject cross-tenant customer references");

    // 12. Financial Retention: Deleting business_account while bills exist MUST be blocked by fk_bills_business_account
    let deleteAccountBlocked = false;
    try {
      await sql`DELETE FROM business_accounts WHERE id = ${tenantAId}`;
    } catch (delErr) {
      deleteAccountBlocked = delErr.message.includes("fk_bills_business_account") || delErr.code === "23503";
    }
    assert.ok(deleteAccountBlocked, "Account hard-deletion must be blocked by ON DELETE RESTRICT when historical bills exist");

  } finally {
    // Cleanup test records
    await sql`DELETE FROM bills WHERE account_id IN (${tenantAId}, ${tenantBId})`;
    await sql`DELETE FROM customers WHERE account_id IN (${tenantAId}, ${tenantBId})`;
    await sql`DELETE FROM items WHERE account_id IN (${tenantAId}, ${tenantBId})`;
    await sql`DELETE FROM business_accounts WHERE id IN (${tenantAId}, ${tenantBId})`;
  }
});
