import test from "node:test";
import assert from "node:assert/strict";
import { neon, neonConfig } from "@neondatabase/serverless";
import crypto from "crypto";

const rawConnectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const connectionString = rawConnectionString.replace(/&channel_binding=require/g, "").replace(/\?channel_binding=require&?/g, "?");

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

function generateId(prefix = "e2e") {
  return prefix + "_" + crypto.randomBytes(8).toString("hex");
}

test("Flow 1: New business registration, sequence allocation, and bill creation", async () => {
  const accountId = generateId("acc");
  const userId = generateId("usr");
  const seqId = generateId("seq");
  const year = new Date().getFullYear();

  try {
    // 1. Register business account with 7-day trial
    const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO business_accounts (id, business_name, owner_name, trial_starts_at, trial_ends_at, created_at, updated_at)
      VALUES (${accountId}, 'E2E Bakery Shop', 'Baker Bob', NOW(), ${trialEnds.toISOString()}, NOW(), NOW());
    `;

    // 2. Initialize sequence
    await sql`
      INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
      VALUES (${seqId}, ${accountId}, ${year}, 0, NOW());
    `;

    // 3. Add 2 items
    const itm1Id = generateId("itm");
    const itm2Id = generateId("itm");
    await sql`
      INSERT INTO items (id, account_id, name, unit_price, is_active, created_at, updated_at)
      VALUES
        (${itm1Id}, ${accountId}, 'Chocolate Cake', '450.00', true, NOW(), NOW()),
        (${itm2Id}, ${accountId}, 'Croissant', '60.00', true, NOW(), NOW());
    `;

    // 4. Atomically allocate bill number
    const seqResult = await sql`
      UPDATE bill_sequences
      SET current_number = current_number + 1, updated_at = NOW()
      WHERE account_id = ${accountId} AND year = ${year}
      RETURNING current_number;
    `;
    const num = seqResult[0].current_number;
    const billNumber = `BY-${year}-${String(num).padStart(6, "0")}`;
    assert.equal(billNumber, `BY-${year}-000001`);

    // 5. Create bill
    const billId = generateId("bil");
    await sql`
      INSERT INTO bills (
        id, account_id, bill_number, subtotal, taxable_amount, grand_total, payment_status, status, completed_at, created_at, updated_at
      ) VALUES (
        ${billId}, ${accountId}, ${billNumber}, '510.00', '510.00', '510.00', 'PAID', 'COMPLETED', NOW(), NOW(), NOW()
      );
    `;

    // 6. Verify bill in history
    const history = await sql`
      SELECT id, bill_number, grand_total FROM bills WHERE account_id = ${accountId} AND id = ${billId};
    `;
    assert.equal(history.length, 1);
    assert.equal(history[0].bill_number, `BY-${year}-000001`);
    assert.equal(Number(history[0].grand_total), 510);
  } finally {
    await sql`DELETE FROM bills WHERE account_id = ${accountId}`;
    await sql`DELETE FROM items WHERE account_id = ${accountId}`;
    await sql`DELETE FROM bill_sequences WHERE account_id = ${accountId}`;
    await sql`DELETE FROM business_accounts WHERE id = ${accountId}`;
  }
});

test("Flow 2: Customer phone lookup and multiple purchases aggregation", async () => {
  const accountId = generateId("acc");
  const custId = generateId("cst");
  const phone = "+919876599999";

  try {
    await sql`
      INSERT INTO business_accounts (id, business_name, owner_name, trial_starts_at, trial_ends_at, created_at, updated_at)
      VALUES (${accountId}, 'E2E Salon', 'Salon Stylist', NOW(), NOW(), NOW(), NOW());
    `;

    // Create customer
    await sql`
      INSERT INTO customers (id, account_id, name, phone, normalized_phone, created_at, updated_at)
      VALUES (${custId}, ${accountId}, 'Deepa Sharma', '9876599999', ${phone}, NOW(), NOW());
    `;

    // Customer lookup by phone
    const found = await sql`
      SELECT id, name FROM customers WHERE account_id = ${accountId} AND normalized_phone = ${phone};
    `;
    assert.equal(found.length, 1);
    assert.equal(found[0].name, 'Deepa Sharma');

    // Create Bill 1
    const b1Id = generateId("bil");
    await sql`
      INSERT INTO bills (id, account_id, bill_number, customer_id, customer_name_snapshot, subtotal, taxable_amount, grand_total, payment_status, status, completed_at, created_at, updated_at)
      VALUES (${b1Id}, ${accountId}, 'BY-2026-000101', ${custId}, 'Deepa Sharma', '300.00', '300.00', '300.00', 'PAID', 'COMPLETED', NOW(), NOW(), NOW());
    `;

    // Create Bill 2
    const b2Id = generateId("bil");
    await sql`
      INSERT INTO bills (id, account_id, bill_number, customer_id, customer_name_snapshot, subtotal, taxable_amount, grand_total, payment_status, status, completed_at, created_at, updated_at)
      VALUES (${b2Id}, ${accountId}, 'BY-2026-000102', ${custId}, 'Deepa Sharma', '700.00', '700.00', '700.00', 'PAID', 'COMPLETED', NOW(), NOW(), NOW());
    `;

    // Customer purchase aggregation
    const agg = await sql`
      SELECT COUNT(id)::int as count, SUM(grand_total)::numeric as total
      FROM bills WHERE account_id = ${accountId} AND customer_id = ${custId} AND status = 'COMPLETED';
    `;
    assert.equal(agg[0].count, 2);
    assert.equal(Number(agg[0].total), 1000);
  } finally {
    await sql`DELETE FROM bills WHERE account_id = ${accountId}`;
    await sql`DELETE FROM customers WHERE account_id = ${accountId}`;
    await sql`DELETE FROM business_accounts WHERE id = ${accountId}`;
  }
});

test("Flow 3: Cryptographic share token creation and revocation", async () => {
  const accountId = generateId("acc");
  const billId = generateId("bil");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const linkId = generateId("shl");

  try {
    await sql`
      INSERT INTO business_accounts (id, business_name, owner_name, trial_starts_at, trial_ends_at, created_at, updated_at)
      VALUES (${accountId}, 'Share Test Store', 'Share Owner', NOW(), NOW(), NOW(), NOW());
    `;

    await sql`
      INSERT INTO bills (id, account_id, bill_number, subtotal, taxable_amount, grand_total, payment_status, status, completed_at, created_at, updated_at)
      VALUES (${billId}, ${accountId}, 'BY-2026-888888', '150.00', '150.00', '150.00', 'PAID', 'COMPLETED', NOW(), NOW(), NOW());
    `;

    await sql`
      INSERT INTO shared_bill_links (id, bill_id, token_hash, created_at)
      VALUES (${linkId}, ${billId}, ${tokenHash}, NOW());
    `;

    // Query with correct token hash
    const foundLink = await sql`
      SELECT id FROM shared_bill_links WHERE token_hash = ${tokenHash} AND revoked_at IS NULL;
    `;
    assert.equal(foundLink.length, 1);

    // Revoke link
    await sql`
      UPDATE shared_bill_links SET revoked_at = NOW() WHERE id = ${linkId};
    `;

    const afterRevoke = await sql`
      SELECT id FROM shared_bill_links WHERE token_hash = ${tokenHash} AND revoked_at IS NULL;
    `;
    assert.equal(afterRevoke.length, 0, "Revoked link should not be returned");
  } finally {
    await sql`DELETE FROM shared_bill_links WHERE id = ${linkId}`;
    await sql`DELETE FROM bills WHERE account_id = ${accountId}`;
    await sql`DELETE FROM business_accounts WHERE id = ${accountId}`;
  }
});

test("Flow 5 & 6: Trial expiration and admin extension audit log", async () => {
  const accountId = generateId("acc");
  const adminUserId = generateId("usr_adm");

  try {
    // Create admin user first to satisfy foreign key constraint
    await sql`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (${adminUserId}, 'Test Admin', ${adminUserId + '@test.com'}, 'hash', 'ADMIN', NOW(), NOW());
    `;

    // 1. Expired trial account (in the past)
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await sql`
      INSERT INTO business_accounts (id, business_name, owner_name, status, subscription_status, trial_starts_at, trial_ends_at, created_at, updated_at)
      VALUES (${accountId}, 'Expired Shop', 'Late Owner', 'ACTIVE', 'TRIAL', NOW(), ${pastDate.toISOString()}, NOW(), NOW());
    `;

    // Verify expired status
    const acc = await sql`
      SELECT trial_ends_at < NOW() as is_expired FROM business_accounts WHERE id = ${accountId};
    `;
    assert.equal(acc[0].is_expired, true);

    // 2. Admin extends trial
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await sql`
      UPDATE business_accounts
      SET trial_ends_at = ${futureDate.toISOString()}, updated_at = NOW()
      WHERE id = ${accountId};
    `;

    const logId = generateId("aud");
    await sql`
      INSERT INTO admin_audit_logs (id, admin_user_id, target_account_id, action, details, created_at)
      VALUES (${logId}, ${adminUserId}, ${accountId}, 'EXTEND_TRIAL_14_DAYS', '{"extended_by_days": 14}', NOW());
    `;

    // Verify active again and audit log recorded
    const accRestored = await sql`
      SELECT trial_ends_at > NOW() as is_active FROM business_accounts WHERE id = ${accountId};
    `;
    assert.equal(accRestored[0].is_active, true);

    const logs = await sql`
      SELECT action FROM admin_audit_logs WHERE target_account_id = ${accountId};
    `;
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'EXTEND_TRIAL_14_DAYS');
  } finally {
    await sql`DELETE FROM admin_audit_logs WHERE target_account_id = ${accountId}`;
    await sql`DELETE FROM business_accounts WHERE id = ${accountId}`;
    await sql`DELETE FROM users WHERE id = ${adminUserId}`;
  }
});
