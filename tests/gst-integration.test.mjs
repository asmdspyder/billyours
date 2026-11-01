import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { neon, neonConfig } from "@neondatabase/serverless";
import { calculateBillTotals } from "../src/lib/billing-calculations.ts";

// Setup database connection
if (!process.env.DATABASE_URL && fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2]?.trim();
    }
  }
}

const rawUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_0MdJsyABDk3S@ep-plain-dew-azwdsnvh-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const url = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?");

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

test("Database Schema Verification: GST Columns Exist on all required tables", async () => {
  // Check business_accounts columns
  const baCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'business_accounts' 
      AND column_name IN ('gstin', 'gst_registration_type', 'pan');
  `;
  const baColNames = baCols.map((c) => c.column_name);
  assert.ok(baColNames.includes("gstin"), "business_accounts missing gstin");
  assert.ok(baColNames.includes("gst_registration_type"), "business_accounts missing gst_registration_type");
  assert.ok(baColNames.includes("pan"), "business_accounts missing pan");

  // Check items columns
  const itemCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'items' 
      AND column_name IN ('tax_treatment', 'gst_rate', 'price_type', 'hsn_sac_code');
  `;
  const itemColNames = itemCols.map((c) => c.column_name);
  assert.ok(itemColNames.includes("tax_treatment"), "items missing tax_treatment");
  assert.ok(itemColNames.includes("gst_rate"), "items missing gst_rate");
  assert.ok(itemColNames.includes("price_type"), "items missing price_type");
  assert.ok(itemColNames.includes("hsn_sac_code"), "items missing hsn_sac_code");

  // Check bills columns
  const billCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'bills' 
      AND column_name IN ('place_of_supply_state', 'is_inter_state', 'total_cgst', 'total_sgst', 'total_igst', 'total_tax', 'round_off');
  `;
  const billColNames = billCols.map((c) => c.column_name);
  assert.ok(billColNames.includes("place_of_supply_state"), "bills missing place_of_supply_state");
  assert.ok(billColNames.includes("is_inter_state"), "bills missing is_inter_state");
  assert.ok(billColNames.includes("total_cgst"), "bills missing total_cgst");
  assert.ok(billColNames.includes("total_sgst"), "bills missing total_sgst");
  assert.ok(billColNames.includes("total_igst"), "bills missing total_igst");
  assert.ok(billColNames.includes("total_tax"), "bills missing total_tax");
  assert.ok(billColNames.includes("round_off"), "bills missing round_off");

  // Check bill_items columns
  const biCols = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'bill_items' 
      AND column_name IN ('hsn_sac_code', 'tax_treatment', 'price_type', 'gst_rate', 'taxable_amount', 'cgst_rate', 'cgst_amount', 'sgst_rate', 'sgst_amount', 'igst_rate', 'igst_amount', 'total_tax', 'line_total');
  `;
  const biColNames = biCols.map((c) => c.column_name);
  assert.ok(biColNames.includes("taxable_amount"), "bill_items missing taxable_amount");
  assert.ok(biColNames.includes("cgst_amount"), "bill_items missing cgst_amount");
  assert.ok(biColNames.includes("sgst_amount"), "bill_items missing sgst_amount");
  assert.ok(biColNames.includes("igst_amount"), "bill_items missing igst_amount");
  assert.ok(biColNames.includes("total_tax"), "bill_items missing total_tax");
  assert.ok(biColNames.includes("line_total"), "bill_items missing line_total");
});

test("Database Migration: Historical Bills and Items Integrity", async () => {
  // Verify that historical bills still have their original grand totals and subtotals intact
  const historicalBills = await sql`
    SELECT id, bill_number, subtotal, grand_total, tax_amount, total_tax
    FROM bills
    WHERE created_at < NOW() - INTERVAL '1 day'
    LIMIT 5;
  `;

  if (historicalBills.length > 0) {
    for (const bill of historicalBills) {
      assert.ok(Number(bill.grand_total) >= 0, `Bill ${bill.bill_number} has valid grand_total`);
      assert.ok(Number(bill.subtotal) >= 0, `Bill ${bill.bill_number} has valid subtotal`);
      // total_tax should match tax_amount from backfill
      assert.equal(
        Number(bill.total_tax),
        Number(bill.tax_amount),
        `Historical bill ${bill.bill_number} preserved tax totals`
      );
    }
  }
});

test("End-to-End Invoice Creation & Snapshot Persistence in Neon DB", async () => {
  // Get active business account
  const accounts = await sql`
    SELECT id, business_name, state, gstin, gst_registration_type
    FROM business_accounts
    WHERE status = 'ACTIVE' AND (id = 'acc_demo_sharma' OR id NOT LIKE 'acc_%_%')
    ORDER BY created_at ASC
    LIMIT 1;
  `;
  assert.ok(accounts.length > 0, "Demo account found");
  const demoAccount = accounts[0];
  const accountId = demoAccount.id;
  const supplierState = demoAccount.state || "Tamil Nadu";

  // 1. Create a test product with GST metadata
  const testItemId = "test-gst-item-" + Date.now();
  const testItemName = "Test GST Monitor " + Date.now();
  const insertItem = await sql`
    INSERT INTO items (
      id, account_id, name, unit_label, unit_price,
      tax_treatment, gst_rate, price_type, hsn_sac_code, is_active
    ) VALUES (
      ${testItemId}, ${accountId}, ${testItemName}, 'pcs', 1180.00,
      'TAXABLE', 18.00, 'INCLUSIVE', '8471', true
    )
    RETURNING id, name, unit_price, tax_treatment, gst_rate, price_type, hsn_sac_code;
  `;
  const createdItem = insertItem[0];
  assert.equal(createdItem.tax_treatment, "TAXABLE");
  assert.equal(Number(createdItem.gst_rate), 18);
  assert.equal(createdItem.price_type, "INCLUSIVE");
  assert.equal(createdItem.hsn_sac_code, "8471");

  // 2. Perform authoritative calculation:
  // Item 1: createdItem (Inclusive 18%, 1180 => Taxable 1000, Tax 180)
  // Item 2: Exclusive 5% (500 => Taxable 500, Tax 25, Line total 525)
  // Item 3: Exempt (2000 => Taxable 2000, Tax 0, Line total 2000)
  const cartItems = [
    {
      itemId: createdItem.id,
      name: createdItem.name,
      unitPrice: 1180,
      quantity: 1,
      taxTreatment: "TAXABLE",
      gstRate: 18,
      priceType: "INCLUSIVE",
      hsnSacCode: "8471",
    },
    {
      name: "Exclusive 5% Paper Pack",
      unitPrice: 500,
      quantity: 1,
      taxTreatment: "TAXABLE",
      gstRate: 5,
      priceType: "EXCLUSIVE",
      hsnSacCode: "4802",
    },
    {
      name: "Exempt Product",
      unitPrice: 2000,
      quantity: 1,
      taxTreatment: "EXEMPT",
      gstRate: 0,
      priceType: "EXCLUSIVE",
      hsnSacCode: "0001",
    },
  ];

  // Test intra-state bill
  const intraStateCalc = calculateBillTotals({
    items: cartItems,
    supplierState: "Tamil Nadu",
    placeOfSupplyState: "Tamil Nadu",
    gstRegistrationType: "REGULAR",
  });

  assert.equal(intraStateCalc.isInterState, false);
  assert.equal(intraStateCalc.items[0].taxableAmount, "1000.00");
  assert.equal(intraStateCalc.items[0].cgstAmount, "90.00");
  assert.equal(intraStateCalc.items[0].sgstAmount, "90.00");
  assert.equal(intraStateCalc.items[0].igstAmount, "0.00");
  assert.equal(intraStateCalc.items[0].lineTotal, "1180.00");

  assert.equal(intraStateCalc.items[1].taxableAmount, "500.00");
  assert.equal(intraStateCalc.items[1].cgstAmount, "12.50");
  assert.equal(intraStateCalc.items[1].sgstAmount, "12.50");
  assert.equal(intraStateCalc.items[1].igstAmount, "0.00");
  assert.equal(intraStateCalc.items[1].lineTotal, "525.00");

  assert.equal(intraStateCalc.items[2].taxableAmount, "2000.00");
  assert.equal(intraStateCalc.items[2].totalTax, "0.00");
  assert.equal(intraStateCalc.items[2].lineTotal, "2000.00");

  // Totals:
  // Taxable: 1000 + 500 + 2000 = 3500
  // CGST: 90 + 12.50 = 102.50
  // SGST: 90 + 12.50 = 102.50
  // Total Tax: 205.00
  // Grand Total: 1180 + 525 + 2000 = 3705.00
  assert.equal(intraStateCalc.taxableAmount, "3500.00");
  assert.equal(intraStateCalc.totalCgst, "102.50");
  assert.equal(intraStateCalc.totalSgst, "102.50");
  assert.equal(intraStateCalc.totalIgst, "0.00");
  assert.equal(intraStateCalc.totalTax, "205.00");
  assert.equal(intraStateCalc.grandTotal, "3705.00");

  // 3. Insert bill into database to test persistence
  const testBillId = "test-bill-" + Date.now();
  const testBillNumber = "BILL-GST-INT-" + Math.floor(Math.random() * 100000);
  await sql`
    INSERT INTO bills (
      id, account_id, bill_number, subtotal, discount_amount, discount_type, discount_value,
      tax_amount, grand_total, payment_status, payment_method, status, completed_at,
      tax_enabled, tax_rate, tax_inclusive, taxable_amount,
      place_of_supply_state, is_inter_state, total_cgst, total_sgst, total_igst, total_tax, round_off
    ) VALUES (
      ${testBillId}, ${accountId}, ${testBillNumber}, 3500.00, 0, 'FIXED', 0,
      205.00, 3705.00, 'PAID', 'CASH', 'COMPLETED', NOW(),
      true, 0, false, 3500.00,
      'Tamil Nadu', false, 102.50, 102.50, 0.00, 205.00, 0.00
    );
  `;
  const billId = testBillId;

  // Insert bill items
  let itemIndex = 0;
  for (const item of intraStateCalc.items) {
    const biId = "test-bi-" + Date.now() + "-" + itemIndex++;
    await sql`
      INSERT INTO bill_items (
        id, account_id, bill_id, item_id, item_name_snapshot, unit_price, quantity, line_subtotal,
        hsn_sac_code, tax_treatment, price_type, gst_rate, taxable_amount,
        cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_tax, line_total
      ) VALUES (
        ${biId}, ${accountId}, ${billId}, ${item.itemId || null}, ${item.name}, ${item.unitPrice}, ${item.quantity}, ${item.taxableAmount},
        ${item.hsnSacCode || null}, ${item.taxTreatment}, ${item.priceType}, ${item.gstRate}, ${item.taxableAmount},
        ${item.cgstRate}, ${item.cgstAmount}, ${item.sgstRate}, ${item.sgstAmount}, ${item.igstRate}, ${item.igstAmount}, ${item.totalTax}, ${item.lineTotal}
      );
    `;
  }

  // 4. Query back and verify snapshots are preserved
  const savedBill = await sql`
    SELECT * FROM bills WHERE id = ${billId};
  `;
  assert.equal(savedBill[0].bill_number, testBillNumber);
  assert.equal(Number(savedBill[0].total_cgst), 102.50);
  assert.equal(Number(savedBill[0].total_sgst), 102.50);
  assert.equal(Number(savedBill[0].total_igst), 0);
  assert.equal(Number(savedBill[0].total_tax), 205.00);
  assert.equal(Number(savedBill[0].grand_total), 3705.00);

  const savedItems = await sql`
    SELECT * FROM bill_items WHERE bill_id = ${billId} ORDER BY id ASC;
  `;
  assert.equal(savedItems.length, 3);
  assert.equal(savedItems[0].hsn_sac_code, "8471");
  assert.equal(Number(savedItems[0].taxable_amount), 1000.00);
  assert.equal(Number(savedItems[0].cgst_amount), 90.00);
  assert.equal(Number(savedItems[0].sgst_amount), 90.00);
  assert.equal(Number(savedItems[0].line_total), 1180.00);

  // 5. Clean up test records
  await sql`DELETE FROM bill_items WHERE bill_id = ${billId};`;
  await sql`DELETE FROM bills WHERE id = ${billId};`;
  await sql`DELETE FROM items WHERE id = ${createdItem.id};`;
});
