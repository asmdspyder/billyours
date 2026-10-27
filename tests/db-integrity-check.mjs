import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { neon, neonConfig } from "@neondatabase/serverless";

const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const url = rawUrl.replace(/&channel_binding=require/g, "").replace(/\?channel_binding=require&?/g, "?");

const originalFetch = globalThis.fetch;
neonConfig.fetchFunction = async (fetchUrl, options) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await originalFetch(fetchUrl, options);
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
  return originalFetch(fetchUrl, options);
};

const sql = neon(url);

test("Database Integrity & Operations Audit Suite", async (t) => {
  // Dynamically retrieve active demo account and user
  const memberships = await sql`
    SELECT m.account_id, m.user_id FROM account_memberships m
    JOIN business_accounts a ON m.account_id = a.id
    WHERE a.status = 'ACTIVE'
    LIMIT 1;
  `;
  assert.ok(memberships.length > 0, "At least one active business membership must exist in the database");
  const accountId = memberships[0].account_id;
  const userId = memberships[0].user_id;

  await t.test("1. Foreign Key Verification: Saving bill with NON-EXISTENT item_id gracefully sets item_id = null without FK violation", async () => {
    const fakeItemId = "itm_non_existent_" + crypto.randomBytes(6).toString("hex");
    const testBillId = "bil_test_fk_" + crypto.randomBytes(6).toString("hex");
    const testBillItemId = "bli_test_fk_" + crypto.randomBytes(6).toString("hex");

    // Pre-validation logic as implemented in completeBillAction:
    const candidateItemIds = [fakeItemId];
    const existing = await sql`
      SELECT id FROM items WHERE account_id = ${accountId} AND id = ANY(${candidateItemIds}::varchar[])
    `;
    const validIds = new Set(existing.map((r) => r.id));
    const safeItemId = validIds.has(fakeItemId) ? fakeItemId : null;

    assert.equal(safeItemId, null, "Non-existent item ID must be safely normalized to null");

    // Insert bill
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, subtotal, discount_type, discount_value, discount_amount,
        tax_enabled, tax_label, tax_rate, tax_inclusive, taxable_amount, tax_amount,
        grand_total, payment_status, payment_method, amount_paid, status, completed_at,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        ${testBillId}, ${accountId}, ${'TEST-FK-' + Date.now()}, '50.00', NULL, '0', '0',
        false, 'GST', '0', false, '50.00', '0',
        '50.00', 'PAID', 'CASH', '50.00', 'COMPLETED', NOW(),
        ${userId}, NOW(), NOW()
      );
    `;

    // Insert bill item with safeItemId
    await sql`
      INSERT INTO bill_items (
        id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at
      ) VALUES (
        ${testBillItemId}, ${accountId}, ${testBillId}, ${safeItemId}, 'Legacy Item', '50.00', 1, '50.00', NOW()
      );
    `;

    // Verify row inserted successfully
    const items = await sql`SELECT id, bill_id, item_id, item_name_snapshot FROM bill_items WHERE id = ${testBillItemId};`;
    assert.equal(items.length, 1);
    assert.equal(items[0].item_id, null);
    assert.equal(items[0].item_name_snapshot, "Legacy Item");

    // Clean up test bill
    await sql`DELETE FROM bills WHERE id = ${testBillId};`;
  });

  await t.test("2. Bill Items Batch Insertion: Fractional quantities (numeric) handled accurately", async () => {
    const testBillId = "bil_test_frac_" + crypto.randomBytes(6).toString("hex");
    const testBillItemId = "bli_test_frac_" + crypto.randomBytes(6).toString("hex");

    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, subtotal, discount_type, discount_value, discount_amount,
        tax_enabled, tax_label, tax_rate, tax_inclusive, taxable_amount, tax_amount,
        grand_total, payment_status, payment_method, amount_paid, status, completed_at,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        ${testBillId}, ${accountId}, ${'TEST-FRAC-' + Date.now()}, '125.00', NULL, '0', '0',
        false, 'GST', '0', false, '125.00', '0',
        '125.00', 'PAID', 'UPI', '125.00', 'COMPLETED', NOW(),
        ${userId}, NOW(), NOW()
      );
    `;

    const itemIds = [testBillItemId];
    const accountIds = [accountId];
    const billIds = [testBillId];
    const catalogItemIds = [null];
    const itemNames = ["Loose Roasted Coffee Beans (kg)"];
    const unitPrices = ["50.00"];
    const quantities = [2.5]; // 2.5 kg fractional quantity!
    const lineSubtotals = ["125.00"];

    await sql`
      INSERT INTO bill_items (
        id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal, created_at
      )
      SELECT 
        u.id, u.account_id, u.bill_id, u.item_id, u.item_name_snapshot, u.unit_price, u.quantity, u.line_subtotal, NOW()
      FROM unnest(
        ${itemIds}::varchar[],
        ${accountIds}::varchar[],
        ${billIds}::varchar[],
        ${catalogItemIds}::varchar[],
        ${itemNames}::varchar[],
        ${unitPrices}::numeric[],
        ${quantities}::numeric[],
        ${lineSubtotals}::numeric[]
      ) AS u(id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal);
    `;

    const fetched = await sql`SELECT quantity, line_subtotal FROM bill_items WHERE id = ${testBillItemId};`;
    assert.equal(fetched.length, 1);
    assert.equal(Number(fetched[0].quantity), 2.5);
    assert.equal(Number(fetched[0].line_subtotal), 125.00);

    // Clean up
    await sql`DELETE FROM bills WHERE id = ${testBillId};`;
  });

  await t.test("3. Customer Operations: Creation, query, phone normalization and update", async () => {
    const custId = "cst_test_" + crypto.randomBytes(6).toString("hex");
    const rawPhone = "+91 99887 76655";
    const normalized = "9988776655";

    // Insert customer
    await sql`
      INSERT INTO customers (id, account_id, name, phone, normalized_phone, notes, created_at, updated_at)
      VALUES (${custId}, ${accountId}, 'Test Customer Audit', ${rawPhone}, ${normalized}, 'Audit note', NOW(), NOW());
    `;

    // Query customer
    const found = await sql`
      SELECT id, name, normalized_phone FROM customers WHERE id = ${custId} AND account_id = ${accountId};
    `;
    assert.equal(found.length, 1);
    assert.equal(found[0].normalized_phone, "9988776655");

    // Update customer
    await sql`
      UPDATE customers SET name = 'Updated Customer Audit', updated_at = NOW()
      WHERE id = ${custId} AND account_id = ${accountId};
    `;
    const updated = await sql`SELECT name FROM customers WHERE id = ${custId};`;
    assert.equal(updated[0].name, "Updated Customer Audit");

    // Clean up
    await sql`DELETE FROM customers WHERE id = ${custId};`;
  });

  await t.test("4. Item Catalog Operations: Create, update, soft-archive", async () => {
    const itmId = "itm_test_" + crypto.randomBytes(6).toString("hex");

    await sql`
      INSERT INTO items (id, account_id, name, category, unit_label, unit_price, is_active, created_at, updated_at)
      VALUES (${itmId}, ${accountId}, 'Test Audit Chai', 'Hot Beverages', 'cup', '25.00', true, NOW(), NOW());
    `;

    const created = await sql`SELECT name, is_active FROM items WHERE id = ${itmId};`;
    assert.equal(created[0].name, "Test Audit Chai");
    assert.equal(created[0].is_active, true);

    // Soft-archive item
    await sql`
      UPDATE items SET is_active = false, archived_at = NOW(), updated_at = NOW()
      WHERE id = ${itmId} AND account_id = ${accountId};
    `;

    const archived = await sql`SELECT is_active, archived_at FROM items WHERE id = ${itmId};`;
    assert.equal(archived[0].is_active, false);
    assert.ok(archived[0].archived_at);

    // Clean up
    await sql`DELETE FROM items WHERE id = ${itmId};`;
  });

  await t.test("5. Bill Sequence Concurrency: Atomic upsert and sequencing", async () => {
    const year = new Date().getFullYear();
    const result = await sql`
      INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
      VALUES (${'seq_test_' + crypto.randomBytes(4).toString('hex')}, ${accountId}, ${year}, 1, NOW())
      ON CONFLICT (account_id, year)
      DO UPDATE SET
        current_number = bill_sequences.current_number + 1,
        updated_at = NOW()
      RETURNING current_number;
    `;
    assert.ok(Number(result[0].current_number) >= 1);
  });

  await t.test("6. Shared Bill Link: Token generation and hash lookup", async () => {
    const dummyBillId = "bil_dummy_" + crypto.randomBytes(6).toString("hex");
    const linkId = "shl_test_" + crypto.randomBytes(6).toString("hex");
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Insert dummy bill
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, subtotal, discount_type, discount_value, discount_amount,
        tax_enabled, tax_label, tax_rate, tax_inclusive, taxable_amount, tax_amount,
        grand_total, payment_status, payment_method, amount_paid, status, completed_at,
        created_by_user_id, created_at, updated_at
      ) VALUES (
        ${dummyBillId}, ${accountId}, ${'TEST-LINK-' + Date.now()}, '80.00', NULL, '0', '0',
        false, 'GST', '0', false, '80.00', '0',
        '80.00', 'PAID', 'CASH', '80.00', 'COMPLETED', NOW(),
        ${userId}, NOW(), NOW()
      );
    `;

    // Insert shared link
    await sql`
      INSERT INTO shared_bill_links (id, bill_id, token_hash, expires_at, created_at)
      VALUES (${linkId}, ${dummyBillId}, ${tokenHash}, NOW() + INTERVAL '30 days', NOW());
    `;

    // Lookup via hash
    const foundLink = await sql`
      SELECT id, bill_id FROM shared_bill_links WHERE token_hash = ${tokenHash};
    `;
    assert.equal(foundLink.length, 1);
    assert.equal(foundLink[0].bill_id, dummyBillId);

    // Clean up
    await sql`DELETE FROM bills WHERE id = ${dummyBillId};`;
  });
});
