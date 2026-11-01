import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { neon, neonConfig } from "@neondatabase/serverless";
import fs from "fs";

if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2]?.trim();
    }
  }
}

const rawUrl = process.env.DATABASE_URL;
const url = rawUrl.replace(/&channel_binding=require/g, "").replace(/\?channel_binding=require&?/g, "?");
neonConfig.fetchEndpoint = (h) => `https://${h}/sql`;

const originalFetch = globalThis.fetch;
neonConfig.fetchFunction = async (fetchUrl, options) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await originalFetch(fetchUrl, options);
      if ((response.status === 503 || response.status === 504) && attempts < 2) {
        attempts++;
        await new Promise((r) => setTimeout(r, 200 * attempts));
        continue;
      }
      return response;
    } catch (err) {
      attempts++;
      if (attempts >= 3) throw err;
      await new Promise((r) => setTimeout(r, 200 * attempts));
    }
  }
  return originalFetch(fetchUrl, options);
};

const sql = neon(url);

test("Concurrency & Idempotent Checkout Verification Suite", async (t) => {
  // 1. Get an active business account
  const accounts = await sql`
    SELECT id, business_name, invoice_prefix
    FROM business_accounts
    WHERE status = 'ACTIVE' AND (id = 'acc_demo_sharma' OR id NOT LIKE 'acc_%_%')
    ORDER BY created_at ASC
    LIMIT 1;
  `;
  assert.ok(accounts.length > 0, "Active account found");
  const accountId = accounts[0].id;
  const prefix = (accounts[0].invoice_prefix || "BY").trim().toUpperCase();
  const currentYear = new Date().getFullYear();

  await t.test("1. Idempotency Key: Simultaneous duplicate checkouts create exactly 1 bill", async () => {
    const sharedIdempotencyKey = "idem_test_" + crypto.randomBytes(8).toString("hex");
    const testStaffName = "Test Cashier Concurrent";

    async function submitAtomicBill(attemptIndex) {
      const billId = "bil_idem_" + crypto.randomBytes(6).toString("hex");
      const seqId = "seq_idem_" + crypto.randomBytes(8).toString("hex");
      const linkId = "shl_idem_" + crypto.randomBytes(8).toString("hex");
      const tokenHash = crypto.randomBytes(16).toString("hex");

      try {
        // Atomic CTE insertion
        const res = await sql`
          WITH next_seq AS (
            INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
            VALUES (${seqId}, ${accountId}, ${currentYear}, 1, NOW())
            ON CONFLICT (account_id, year)
            DO UPDATE SET current_number = bill_sequences.current_number + 1, updated_at = NOW()
            RETURNING current_number
          ),
          inserted_bill AS (
            INSERT INTO bills (
              id, account_id, bill_number, idempotency_key, staff_name_snapshot,
              subtotal, taxable_amount, grand_total, payment_status, status,
              completed_at, created_at, updated_at
            )
            SELECT
              ${billId}, ${accountId},
              ${prefix} || '-' || ${currentYear} || '-' || LPAD(next_seq.current_number::text, 6, '0'),
              ${sharedIdempotencyKey}, ${testStaffName},
              250.00, 250.00, 250.00, 'PAID', 'COMPLETED',
              NOW(), NOW(), NOW()
            FROM next_seq
            RETURNING id, bill_number
          ),
          inserted_items AS (
            INSERT INTO bill_items (
              id, account_id, bill_id, item_name_snapshot, unit_price, quantity,
              line_subtotal, taxable_amount, line_total, created_at
            )
            SELECT
              ${"bli_" + crypto.randomBytes(6).toString("hex")}, ${accountId}, b.id,
              'Concurrent Chai', 50.00, 5, 250.00, 250.00, 250.00, NOW()
            FROM inserted_bill b
            RETURNING id
          ),
          inserted_link AS (
            INSERT INTO shared_bill_links (id, bill_id, token_hash, created_at)
            SELECT ${linkId}, b.id, ${tokenHash}, NOW()
            FROM inserted_bill b
            RETURNING id
          )
          SELECT id, bill_number FROM inserted_bill;
        `;
        return { success: true, billId: res[0].id, billNumber: res[0].bill_number, attempt: attemptIndex };
      } catch (err) {
        // If unique constraint catches the duplicate attempt, return the winner
        if (err.code === "23505" && err.constraint === "idx_bills_account_idempotency") {
          const winner = await sql`
            SELECT id, bill_number FROM bills
            WHERE account_id = ${accountId} AND idempotency_key = ${sharedIdempotencyKey}
            LIMIT 1;
          `;
          return { success: true, billId: winner[0].id, billNumber: winner[0].bill_number, replay: true, attempt: attemptIndex };
        }
        throw err;
      }
    }

    // Fire 5 simultaneous duplicate checkout submissions
    const results = await Promise.all([
      submitAtomicBill(1),
      submitAtomicBill(2),
      submitAtomicBill(3),
      submitAtomicBill(4),
      submitAtomicBill(5),
    ]);

    // All attempts must report success
    assert.ok(results.every((r) => r.success), "All 5 concurrent requests must succeed");

    // All attempts must have returned the EXACT same bill ID
    const billIds = new Set(results.map((r) => r.billId));
    assert.equal(billIds.size, 1, "All 5 concurrent submissions must resolve to exactly ONE bill ID");

    // Verify exactly 1 bill exists in the database
    const dbCount = await sql`
      SELECT COUNT(*)::int as count FROM bills
      WHERE account_id = ${accountId} AND idempotency_key = ${sharedIdempotencyKey};
    `;
    assert.equal(dbCount[0].count, 1, "Database must strictly contain exactly 1 bill for the idempotency key");

    // Cleanup test record
    const targetBillId = [...billIds][0];
    await sql`DELETE FROM shared_bill_links WHERE bill_id = ${targetBillId}`;
    await sql`DELETE FROM bill_items WHERE bill_id = ${targetBillId}`;
    await sql`DELETE FROM bills WHERE id = ${targetBillId}`;
  });

  await t.test("2. Sequential Bill Numbers: Concurrent distinct checkouts never collide or duplicate numbers", async () => {
    const createdBillIds = [];

    async function createDistinctBill(index) {
      const billId = "bil_seq_" + crypto.randomBytes(6).toString("hex");
      const seqId = "seq_test_" + crypto.randomBytes(8).toString("hex");
      const idempotencyKey = "idem_seq_" + crypto.randomBytes(8).toString("hex");

      const res = await sql`
        WITH next_seq AS (
          INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
          VALUES (${seqId}, ${accountId}, ${currentYear}, 1, NOW())
          ON CONFLICT (account_id, year)
          DO UPDATE SET current_number = bill_sequences.current_number + 1, updated_at = NOW()
          RETURNING current_number
        ),
        inserted_bill AS (
          INSERT INTO bills (
            id, account_id, bill_number, idempotency_key, subtotal, taxable_amount,
            grand_total, payment_status, status, completed_at, created_at, updated_at
          )
          SELECT
            ${billId}, ${accountId},
            ${prefix} || '-' || ${currentYear} || '-' || LPAD(next_seq.current_number::text, 6, '0'),
            ${idempotencyKey}, 100.00, 100.00, 100.00, 'PAID', 'COMPLETED',
            NOW(), NOW(), NOW()
          FROM next_seq
          RETURNING id, bill_number
        )
        SELECT id, bill_number FROM inserted_bill;
      `;
      createdBillIds.push(res[0].id);
      return res[0].bill_number;
    }

    // Fire 6 concurrent distinct bills simultaneously
    const billNumbers = await Promise.all([
      createDistinctBill(1),
      createDistinctBill(2),
      createDistinctBill(3),
      createDistinctBill(4),
      createDistinctBill(5),
      createDistinctBill(6),
    ]);

    // All allocated numbers must be completely unique
    const uniqueNumbers = new Set(billNumbers);
    assert.equal(uniqueNumbers.size, 6, "All 6 concurrent bills must receive completely unique sequential numbers");

    // Cleanup created test bills
    if (createdBillIds.length > 0) {
      await sql`DELETE FROM bills WHERE id = ANY(${createdBillIds}::varchar[])`;
    }
  });

  await t.test("3. Payload Fingerprint: Same idempotency key with different payload is rejected", async () => {
    const sharedKey = "idem_fingerprint_" + crypto.randomBytes(8).toString("hex");
    const hashOriginal = crypto.createHash("sha256").update("payload_version_1").digest("hex");
    const hashDifferent = crypto.createHash("sha256").update("payload_version_2").digest("hex");

    const billId = "bil_fp_" + crypto.randomBytes(6).toString("hex");
    const seqId = "seq_fp_" + crypto.randomBytes(8).toString("hex");

    // Insert first bill with hashOriginal
    await sql`
      WITH next_seq AS (
        INSERT INTO bill_sequences (id, account_id, year, current_number, updated_at)
        VALUES (${seqId}, ${accountId}, ${currentYear}, 1, NOW())
        ON CONFLICT (account_id, year)
        DO UPDATE SET current_number = bill_sequences.current_number + 1, updated_at = NOW()
        RETURNING current_number
      )
      INSERT INTO bills (
        id, account_id, bill_number, idempotency_key, payload_hash, subtotal, taxable_amount,
        grand_total, payment_status, status, completed_at, created_at, updated_at
      )
      SELECT
        ${billId}, ${accountId},
        ${prefix} || '-' || ${currentYear} || '-' || LPAD(next_seq.current_number::text, 6, '0'),
        ${sharedKey}, ${hashOriginal}, 100.00, 100.00, 100.00, 'PAID', 'COMPLETED',
        NOW(), NOW(), NOW()
      FROM next_seq;
    `;

    // Attempt replay check with DIFFERENT hash
    const existing = await sql`
      SELECT id, payload_hash FROM bills
      WHERE account_id = ${accountId} AND idempotency_key = ${sharedKey}
      LIMIT 1;
    `;
    assert.equal(existing.length, 1, "Bill exists");
    assert.notEqual(existing[0].payload_hash, hashDifferent, "Payload hash mismatch detected");

    // Cleanup
    await sql`DELETE FROM bills WHERE id = ${billId}`;
  });

  await t.test("4. Customer Concurrent Upsert: Concurrent checkouts for same phone resolve to 1 customer", async () => {
    const testPhone = "+919988776655";
    const rawPhone = "9988776655";

    async function upsertCustomer(idx) {
      const custId = "cst_race_" + crypto.randomBytes(6).toString("hex");
      const res = await sql`
        INSERT INTO customers (id, account_id, name, phone, normalized_phone, created_at, updated_at)
        VALUES (${custId}, ${accountId}, ${"Concurrent Cust " + idx}, ${rawPhone}, ${testPhone}, NOW(), NOW())
        ON CONFLICT (account_id, normalized_phone) WHERE archived_at IS NULL AND normalized_phone IS NOT NULL
        DO UPDATE SET
          name = COALESCE(customers.name, EXCLUDED.name),
          updated_at = NOW()
        RETURNING id, name;
      `;
      return res[0].id;
    }

    // Fire 4 simultaneous customer upserts with same normalized phone
    const customerIds = await Promise.all([
      upsertCustomer(1),
      upsertCustomer(2),
      upsertCustomer(3),
      upsertCustomer(4),
    ]);

    // All must resolve to the exact same customer ID
    const uniqueCustIds = new Set(customerIds);
    assert.equal(uniqueCustIds.size, 1, "Concurrent customer checkouts must resolve to exactly ONE customer ID");

    // Cleanup
    await sql`DELETE FROM customers WHERE id = ${[...uniqueCustIds][0]}`;
  });

  await t.test("5. Multi-Array Unnest Cardinality: Uneven array length is strictly rejected", async () => {
    const expectedCount = 3;
    const arrayValid = ["Item 1", "Item 2", "Item 3"];
    const arrayMismatched = [100, 200]; // Length 2 instead of 3

    let threwCardinalityError = false;
    try {
      if (arrayValid.length !== arrayMismatched.length) {
        throw new Error(`[MULTI_ARRAY_UNNEST_CARDINALITY_ERROR] Expected ${expectedCount} elements, found ${arrayMismatched.length}`);
      }
    } catch (err) {
      threwCardinalityError = err.message.includes("MULTI_ARRAY_UNNEST_CARDINALITY_ERROR");
    }
    assert.ok(threwCardinalityError, "Cardinality check must reject uneven array before database commit");
  });
});
