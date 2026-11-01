import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBillTotals,
  calculateItemGstPreview,
  roundTo2,
  formatMoney,
} from "../src/lib/billing-calculations.ts";

test("Scenario 1: No GST applied", () => {
  const result = calculateBillTotals({
    items: [
      {
        name: "Exempt Product",
        unitPrice: 1000,
        quantity: 1,
        taxTreatment: "TAXABLE",
        gstRate: 0,
        priceType: "EXCLUSIVE",
      },
    ],
    supplierState: "Karnataka",
    placeOfSupplyState: "Karnataka",
  });

  assert.equal(result.subtotal, "1000.00");
  assert.equal(result.taxableAmount, "1000.00");
  assert.equal(result.totalTax, "0.00");
  assert.equal(result.grandTotal, "1000.00");
  assert.equal(result.items[0].lineTotal, "1000.00");
  assert.equal(result.items[0].totalTax, "0.00");
});

test("Scenario 2: Inclusive GST (₹1,000 at 18%)", () => {
  const result = calculateBillTotals({
    items: [
      {
        name: "Item with inclusive GST",
        unitPrice: 1000,
        quantity: 1,
        taxTreatment: "TAXABLE",
        gstRate: 18,
        priceType: "INCLUSIVE",
      },
    ],
    supplierState: "Karnataka",
    placeOfSupplyState: "Karnataka",
  });

  // Taxable = 1000 / 1.18 = 847.46
  // GST = 152.54
  // Line Total = 1000.00
  assert.equal(result.items[0].taxableAmount, "847.46");
  assert.equal(result.items[0].totalTax, "152.54");
  assert.equal(result.items[0].lineTotal, "1000.00");
  assert.equal(result.grandTotal, "1000.00");
  assert.equal(result.totalTax, "152.54");
});

test("Scenario 3: Exclusive GST (₹1,000 at 18%)", () => {
  const result = calculateBillTotals({
    items: [
      {
        name: "Item with exclusive GST",
        unitPrice: 1000,
        quantity: 1,
        taxTreatment: "TAXABLE",
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
    ],
    supplierState: "Karnataka",
    placeOfSupplyState: "Karnataka",
  });

  // Taxable = 1000.00
  // GST = 180.00
  // Line Total = 1180.00
  assert.equal(result.items[0].taxableAmount, "1000.00");
  assert.equal(result.items[0].totalTax, "180.00");
  assert.equal(result.items[0].lineTotal, "1180.00");
  assert.equal(result.grandTotal, "1180.00");
  assert.equal(result.totalTax, "180.00");
});

test("Scenario 4: Multiple GST rates (5%, 12%, 18%) and consolidated summary", () => {
  const result = calculateBillTotals({
    items: [
      {
        name: "Product 5%",
        unitPrice: 100,
        quantity: 2, // 200
        gstRate: 5,
        priceType: "EXCLUSIVE",
      },
      {
        name: "Product 12%",
        unitPrice: 500,
        quantity: 1, // 500
        gstRate: 12,
        priceType: "EXCLUSIVE",
      },
      {
        name: "Product 18%",
        unitPrice: 1000,
        quantity: 1, // 1000
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
    ],
    supplierState: "Maharashtra",
    placeOfSupplyState: "Maharashtra",
  });

  // 5% item: Taxable 200, Tax 10.00 (CGST 5.00, SGST 5.00), Total 210.00
  // 12% item: Taxable 500, Tax 60.00 (CGST 30.00, SGST 30.00), Total 560.00
  // 18% item: Taxable 1000, Tax 180.00 (CGST 90.00, SGST 90.00), Total 1180.00
  // Total Taxable: 1700.00, Total Tax: 250.00, Grand Total: 1950.00
  assert.equal(result.subtotal, "1700.00");
  assert.equal(result.taxableAmount, "1700.00");
  assert.equal(result.totalCgst, "125.00");
  assert.equal(result.totalSgst, "125.00");
  assert.equal(result.totalIgst, "0.00");
  assert.equal(result.totalTax, "250.00");
  assert.equal(result.grandTotal, "1950.00");

  // Verify rate summary grouping
  assert.equal(result.gstSummary.length, 3);
  const group5 = result.gstSummary.find((g) => g.gstRate === "5.00");
  const group12 = result.gstSummary.find((g) => g.gstRate === "12.00");
  const group18 = result.gstSummary.find((g) => g.gstRate === "18.00");

  assert(group5 && group12 && group18);
  assert.equal(group5.taxableAmount, "200.00");
  assert.equal(group5.totalTax, "10.00");
  assert.equal(group12.taxableAmount, "500.00");
  assert.equal(group12.totalTax, "60.00");
  assert.equal(group18.taxableAmount, "1000.00");
  assert.equal(group18.totalTax, "180.00");
});

test("Scenario 5: Mixed inclusive, exclusive, and zero tax items", () => {
  const result = calculateBillTotals({
    items: [
      {
        name: "Item A (Exclusive 18%)",
        unitPrice: 1000,
        quantity: 1,
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
      {
        name: "Item B (Inclusive 5%)",
        unitPrice: 500,
        quantity: 1,
        gstRate: 5,
        priceType: "INCLUSIVE",
      },
      {
        name: "Item C (No GST)",
        unitPrice: 2000,
        quantity: 1,
        taxTreatment: "EXEMPT",
        gstRate: 0,
        priceType: "EXCLUSIVE",
      },
    ],
    supplierState: "Tamil Nadu",
    placeOfSupplyState: "Tamil Nadu",
  });

  // Item A: Taxable 1000, Tax 180, Total 1180
  // Item B: Taxable 476.19, Tax 23.81, Total 500
  // Item C: Taxable 2000, Tax 0, Total 2000
  assert.equal(result.items[0].taxableAmount, "1000.00");
  assert.equal(result.items[0].totalTax, "180.00");
  assert.equal(result.items[0].lineTotal, "1180.00");

  assert.equal(result.items[1].taxableAmount, "476.19");
  assert.equal(result.items[1].totalTax, "23.81");
  assert.equal(result.items[1].lineTotal, "500.00");

  assert.equal(result.items[2].taxableAmount, "2000.00");
  assert.equal(result.items[2].totalTax, "0.00");
  assert.equal(result.items[2].lineTotal, "2000.00");

  // Total Taxable: 1000 + 476.19 + 2000 = 3476.19
  // Total Tax: 180 + 23.81 = 203.81
  // Grand Total: 1180 + 500 + 2000 = 3680.00
  assert.equal(result.taxableAmount, "3476.19");
  assert.equal(result.totalTax, "203.81");
  assert.equal(result.grandTotal, "3680.00");
});

test("Scenario 6: Intra-state invoice splits GST equally into CGST & SGST", () => {
  const result = calculateBillTotals({
    items: [
      {
        name: "Product",
        unitPrice: 1000,
        quantity: 1,
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
    ],
    supplierState: "Karnataka",
    placeOfSupplyState: "Karnataka",
  });

  assert.equal(result.isInterState, false);
  assert.equal(result.totalCgst, "90.00");
  assert.equal(result.totalSgst, "90.00");
  assert.equal(result.totalIgst, "0.00");
  assert.equal(result.totalTax, "180.00");
});

test("Scenario 7: Inter-state invoice charges 100% IGST", () => {
  const result = calculateBillTotals({
    items: [
      {
        name: "Product",
        unitPrice: 1000,
        quantity: 1,
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
    ],
    supplierState: "Karnataka",
    placeOfSupplyState: "Maharashtra", // Inter-state!
  });

  assert.equal(result.isInterState, true);
  assert.equal(result.totalCgst, "0.00");
  assert.equal(result.totalSgst, "0.00");
  assert.equal(result.totalIgst, "180.00");
  assert.equal(result.totalTax, "180.00");
});

test("Scenario 8: Discounts reduce taxable base before GST calculation (GST Sec 15(3))", () => {
  const result = calculateBillTotals({
    items: [
      {
        name: "Service",
        unitPrice: 1000,
        quantity: 1,
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
    ],
    discountType: "FIXED",
    discountValue: 200,
    supplierState: "Delhi",
    placeOfSupplyState: "Delhi",
  });

  // Net taxable = 1000 - 200 = 800
  // GST 18% of 800 = 144
  // Grand total = 800 + 144 = 944
  assert.equal(result.subtotal, "1000.00");
  assert.equal(result.discountAmount, "200.00");
  assert.equal(result.taxableAmount, "800.00");
  assert.equal(result.totalTax, "144.00");
  assert.equal(result.grandTotal, "944.00");
});

test("Scenario 9: Unregistered & Composition businesses cannot charge GST", () => {
  const unregResult = calculateBillTotals({
    items: [
      {
        name: "Product",
        unitPrice: 1000,
        quantity: 1,
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
    ],
    gstRegistrationType: "UNREGISTERED",
  });

  assert.equal(unregResult.totalTax, "0.00");
  assert.equal(unregResult.grandTotal, "1000.00");

  const compResult = calculateBillTotals({
    items: [
      {
        name: "Product",
        unitPrice: 1000,
        quantity: 1,
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
    ],
    gstRegistrationType: "COMPOSITION",
  });

  assert.equal(compResult.totalTax, "0.00");
  assert.equal(compResult.grandTotal, "1000.00");
});

test("Scenario 10: Live preview card calculations match exactly", () => {
  const previewInc = calculateItemGstPreview({
    unitPrice: 1000,
    gstRate: 18,
    priceType: "INCLUSIVE",
  });
  assert.equal(previewInc.taxableValue, 847.46);
  assert.equal(previewInc.gstAmount, 152.54);
  assert.equal(previewInc.finalPrice, 1000);

  const previewExc = calculateItemGstPreview({
    unitPrice: 1000,
    gstRate: 18,
    priceType: "EXCLUSIVE",
  });
  assert.equal(previewExc.taxableValue, 1000);
  assert.equal(previewExc.gstAmount, 180);
  assert.equal(previewExc.finalPrice, 1180);
});

test("Scenario 11: Fractional paise rounding precision", () => {
  // 3 items with odd amounts and 18% GST:
  // Item 1: 33.33 * 3 = 99.99
  const result = calculateBillTotals({
    items: [
      {
        name: "Small Item",
        unitPrice: 33.33,
        quantity: 3,
        gstRate: 18,
        priceType: "EXCLUSIVE",
      },
    ],
    supplierState: "Goa",
    placeOfSupplyState: "Goa",
  });

  // Gross = 99.99
  // GST = Round(99.99 * 0.18, 2) = Round(17.9982) = 18.00
  // CGST = 9.00, SGST = 9.00
  // Grand total = 117.99
  assert.equal(result.items[0].taxableAmount, "99.99");
  assert.equal(result.items[0].totalTax, "18.00");
  assert.equal(result.items[0].cgstAmount, "9.00");
  assert.equal(result.items[0].sgstAmount, "9.00");
  assert.equal(result.grandTotal, "117.99");
});
