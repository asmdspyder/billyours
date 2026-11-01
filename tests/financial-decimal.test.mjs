import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBillTotals,
  calculateItemGstPreview,
  calculateLineSubtotal,
  formatMoney,
  roundTo2,
  toBig,
} from "../src/lib/billing-calculations.ts";

test("Phase 1: Decimal Financial Arithmetic & GST Accuracy Suite", async (t) => {
  await t.test("1. Basic rounding and edge-case amounts (₹0.01, ₹0.05, ₹1.005, ₹10.15, ₹999.99, ₹1,000.00)", () => {
    assert.equal(formatMoney("0.01"), "0.01");
    assert.equal(formatMoney("0.05"), "0.05");
    // Standard half-up: 1.005 -> 1.01
    assert.equal(formatMoney("1.005"), "1.01");
    assert.equal(formatMoney(1.005), "1.01");
    assert.equal(formatMoney("10.15"), "10.15");
    assert.equal(formatMoney("999.99"), "999.99");
    assert.equal(formatMoney("1000.00"), "1000.00");
    assert.equal(roundTo2("1.005"), 1.01);
  });

  await t.test("2. Fractional quantities (0.25, 0.5, 2.5) with non-round prices", () => {
    // 0.25 kg @ ₹99.99/kg = 24.9975 -> 25.00
    assert.equal(calculateLineSubtotal("99.99", "0.25"), 25.00);
    // 0.5 kg @ ₹33.33/kg = 16.665 -> 16.67
    assert.equal(calculateLineSubtotal("33.33", "0.5"), 16.67);
    // 2.5 kg @ ₹19.99/kg = 49.975 -> 49.98
    assert.equal(calculateLineSubtotal("19.99", "2.5"), 49.98);
  });

  await t.test("3. Single Item Exclusive GST: 18% on ₹100.00", () => {
    const res = calculateBillTotals({
      items: [
        { name: "Item Excl", unitPrice: "100.00", quantity: 1, gstRate: 18, priceType: "EXCLUSIVE" },
      ],
      supplierState: "Karnataka",
      placeOfSupplyState: "Karnataka",
    });

    assert.equal(res.subtotal, "100.00");
    assert.equal(res.taxableAmount, "100.00");
    assert.equal(res.totalCgst, "9.00");
    assert.equal(res.totalSgst, "9.00");
    assert.equal(res.totalIgst, "0.00");
    assert.equal(res.totalTax, "18.00");
    assert.equal(res.grandTotal, "118.00");
    assert.equal(res.items[0].lineTotal, "118.00");
  });

  await t.test("4. Single Item Inclusive GST: 18% on ₹100.00", () => {
    const res = calculateBillTotals({
      items: [
        { name: "Item Incl", unitPrice: "100.00", quantity: 1, gstRate: 18, priceType: "INCLUSIVE" },
      ],
      supplierState: "Maharashtra",
      placeOfSupplyState: "Maharashtra",
    });

    assert.equal(res.subtotal, "100.00");
    assert.equal(res.taxableAmount, "84.75");
    assert.equal(res.totalCgst, "7.63"); // 15.25 / 2 = 7.625 -> 7.63
    assert.equal(res.totalSgst, "7.62"); // 15.25 - 7.63 = 7.62
    assert.equal(res.totalTax, "15.25");
    assert.equal(res.grandTotal, "100.00");
    assert.equal(res.items[0].lineTotal, "100.00");
    // Ensure CGST + SGST === totalTax exactly
    assert.equal(Number(res.totalCgst) + Number(res.totalSgst), 15.25);
  });

  await t.test("5. Inter-State IGST: Different states allocate 100% to IGST", () => {
    const res = calculateBillTotals({
      items: [
        { name: "Laptop", unitPrice: "50000.00", quantity: 1, gstRate: 18, priceType: "EXCLUSIVE" },
      ],
      supplierState: "Karnataka",
      placeOfSupplyState: "Tamil Nadu",
    });

    assert.equal(res.isInterState, true);
    assert.equal(res.totalCgst, "0.00");
    assert.equal(res.totalSgst, "0.00");
    assert.equal(res.totalIgst, "9000.00");
    assert.equal(res.totalTax, "9000.00");
    assert.equal(res.grandTotal, "59000.00");
  });

  await t.test("6. Multi-Rate Invoice (0%, 5%, 12%, 18%, 28%) and GST Summary Grouping", () => {
    const res = calculateBillTotals({
      items: [
        { name: "Fresh Milk", unitPrice: "30.00", quantity: 2, gstRate: 0, priceType: "EXCLUSIVE" }, // 60.00
        { name: "Tea Leaves", unitPrice: "120.00", quantity: 1, gstRate: 5, priceType: "EXCLUSIVE" }, // 120 + 6 = 126
        { name: "Butter", unitPrice: "250.00", quantity: 1, gstRate: 12, priceType: "EXCLUSIVE" }, // 250 + 30 = 280
        { name: "Biscuits", unitPrice: "100.00", quantity: 1, gstRate: 18, priceType: "EXCLUSIVE" }, // 100 + 18 = 118
        { name: "Energy Drink", unitPrice: "200.00", quantity: 1, gstRate: 28, priceType: "EXCLUSIVE" }, // 200 + 56 = 256
      ],
      supplierState: "Delhi",
      placeOfSupplyState: "Delhi",
    });

    assert.equal(res.subtotal, "730.00"); // 60 + 120 + 250 + 100 + 200
    assert.equal(res.taxableAmount, "730.00");
    assert.equal(res.totalTax, "110.00"); // 0 + 6 + 30 + 18 + 56
    assert.equal(res.grandTotal, "840.00"); // 730 + 110

    // Verify rate groups
    assert.equal(res.gstSummary.length, 5);
    const rate5 = res.gstSummary.find((g) => g.gstRate === "5.00");
    assert.ok(rate5);
    assert.equal(rate5.taxableAmount, "120.00");
    assert.equal(rate5.totalTax, "6.00");

    const rate28 = res.gstSummary.find((g) => g.gstRate === "28.00");
    assert.ok(rate28);
    assert.equal(rate28.taxableAmount, "200.00");
    assert.equal(rate28.totalTax, "56.00");

    // Total of line items equals grandTotal
    const lineSum = res.items.reduce((acc, it) => acc + Number(it.lineTotal), 0);
    assert.equal(lineSum.toFixed(2), res.grandTotal);
  });

  await t.test("7. Proportional Discount Allocation (GST Section 15(3)) with exact paisa reconciliation", () => {
    // 3 items with fixed ₹10.00 discount on ₹100.00 gross
    // Lines: ₹50.00 (50%), ₹30.00 (30%), ₹20.00 (20%)
    const res = calculateBillTotals({
      items: [
        { name: "Item A", unitPrice: "50.00", quantity: 1, gstRate: 18, priceType: "EXCLUSIVE" },
        { name: "Item B", unitPrice: "30.00", quantity: 1, gstRate: 18, priceType: "EXCLUSIVE" },
        { name: "Item C", unitPrice: "20.00", quantity: 1, gstRate: 18, priceType: "EXCLUSIVE" },
      ],
      discountType: "FIXED",
      discountValue: "10.00",
      supplierState: "Gujarat",
      placeOfSupplyState: "Gujarat",
    });

    assert.equal(res.subtotal, "100.00");
    assert.equal(res.discountAmount, "10.00");

    // Allocated discounts: ₹5.00, ₹3.00, ₹2.00
    assert.equal(res.items[0].allocatedDiscount, "5.00");
    assert.equal(res.items[1].allocatedDiscount, "3.00");
    assert.equal(res.items[2].allocatedDiscount, "2.00");

    // Sum of allocated discounts MUST strictly equal 10.00
    const sumDiscounts = res.items.reduce((acc, it) => acc + Number(it.allocatedDiscount), 0);
    assert.equal(sumDiscounts.toFixed(2), "10.00");

    // Post-discount taxable base: 45 + 27 + 18 = 90.00
    assert.equal(res.taxableAmount, "90.00");
    assert.equal(res.totalTax, "16.20"); // 18% of 90 = 16.20
    assert.equal(res.grandTotal, "106.20"); // 90 + 16.20 = 106.20
  });

  await t.test("8. Discount with fractional paise allocation that requires reconciliation onto largest line", () => {
    // 3 items of ₹10.00 each = ₹30.00 gross. Discount: ₹1.00 (100 paise)
    // 100 / 3 = 33.3333 paise.
    // Line 1: 0.33, Line 2: 0.33, Line 3: 0.33 -> Sum = 0.99.
    // Difference of 0.01 must be reconciled onto largest line so sum === 1.00!
    const res = calculateBillTotals({
      items: [
        { name: "Item 1", unitPrice: "10.00", quantity: 1, gstRate: 0, priceType: "EXCLUSIVE" },
        { name: "Item 2", unitPrice: "10.00", quantity: 1, gstRate: 0, priceType: "EXCLUSIVE" },
        { name: "Item 3", unitPrice: "10.00", quantity: 1, gstRate: 0, priceType: "EXCLUSIVE" },
      ],
      discountType: "FIXED",
      discountValue: "1.00",
    });

    assert.equal(res.discountAmount, "1.00");
    const sumDiscounts = res.items.reduce((acc, it) => acc + Number(it.allocatedDiscount), 0);
    assert.equal(sumDiscounts.toFixed(2), "1.00"); // Zero loss of paise!
    assert.equal(res.grandTotal, "29.00");
  });

  await t.test("9. Large invoice totals (₹10,000,000.00) without precision loss", () => {
    const res = calculateBillTotals({
      items: [
        { name: "Industrial Machinery", unitPrice: "10000000.00", quantity: 1, gstRate: 18, priceType: "EXCLUSIVE" },
      ],
      supplierState: "Haryana",
      placeOfSupplyState: "Haryana",
    });

    assert.equal(res.subtotal, "10000000.00");
    assert.equal(res.taxableAmount, "10000000.00");
    assert.equal(res.totalCgst, "900000.00");
    assert.equal(res.totalSgst, "900000.00");
    assert.equal(res.totalTax, "1800000.00");
    assert.equal(res.grandTotal, "11800000.00");
  });

  await t.test("10. calculateItemGstPreview matches calculateBillTotals exactly", () => {
    const preview = calculateItemGstPreview({
      unitPrice: "100.00",
      gstRate: 18,
      priceType: "INCLUSIVE",
      taxTreatment: "TAXABLE",
      isRegisteredBusiness: true,
    });

    const bill = calculateBillTotals({
      items: [
        { name: "Preview Item", unitPrice: "100.00", quantity: 1, gstRate: 18, priceType: "INCLUSIVE" },
      ],
    });

    assert.equal(preview.taxableValue, Number(bill.items[0].taxableAmount));
    assert.equal(preview.gstAmount, Number(bill.items[0].totalTax));
    assert.equal(preview.finalPrice, Number(bill.items[0].lineTotal));
  });
});
