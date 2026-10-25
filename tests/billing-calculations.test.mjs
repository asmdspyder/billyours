import test from "node:test";
import assert from "node:assert/strict";

// We can test the logic directly
function roundTo2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function formatMoney(num) {
  return roundTo2(num).toFixed(2);
}

function calculateBillTotals(input) {
  if (!input.items || input.items.length === 0) {
    return {
      subtotal: "0.00",
      discountAmount: "0.00",
      taxableAmount: "0.00",
      taxAmount: "0.00",
      grandTotal: "0.00",
    };
  }

  let calculatedSubtotal = 0;
  for (const item of input.items) {
    const priceNum = Math.max(0, Number(item.unitPrice) || 0);
    const qtyNum = Math.max(0, Number(item.quantity) || 0);
    const lineTotal = roundTo2(priceNum * qtyNum);
    calculatedSubtotal += lineTotal;
  }
  calculatedSubtotal = roundTo2(calculatedSubtotal);

  const rawDiscountType = input.discountType === "PERCENTAGE" || input.discountType === "FIXED" ? input.discountType : null;
  const rawDiscountVal = Math.max(0, Number(input.discountValue) || 0);
  let discountAmount = 0;

  if (rawDiscountType === "FIXED") {
    discountAmount = Math.min(calculatedSubtotal, rawDiscountVal);
  } else if (rawDiscountType === "PERCENTAGE") {
    const cappedPercent = Math.min(100, Math.max(0, rawDiscountVal));
    discountAmount = roundTo2(calculatedSubtotal * (cappedPercent / 100));
  }
  discountAmount = roundTo2(discountAmount);

  const taxableAmount = Math.max(0, roundTo2(calculatedSubtotal - discountAmount));
  const taxEnabled = Boolean(input.taxEnabled);
  const rawTaxRate = taxEnabled ? Math.max(0, Math.min(100, Number(input.taxRate) || 0)) : 0;
  const taxInclusive = Boolean(input.taxInclusive);

  let taxAmount = 0;
  let grandTotal = 0;

  if (taxEnabled && rawTaxRate > 0) {
    if (taxInclusive) {
      taxAmount = roundTo2((taxableAmount * rawTaxRate) / (100 + rawTaxRate));
      grandTotal = taxableAmount;
    } else {
      taxAmount = roundTo2((taxableAmount * rawTaxRate) / 100);
      grandTotal = roundTo2(taxableAmount + taxAmount);
    }
  } else {
    taxAmount = 0;
    grandTotal = taxableAmount;
  }

  return {
    subtotal: formatMoney(calculatedSubtotal),
    discountAmount: formatMoney(discountAmount),
    taxableAmount: formatMoney(taxableAmount),
    taxAmount: formatMoney(taxAmount),
    grandTotal: formatMoney(grandTotal),
  };
}

test("Empty bill produces zeros", () => {
  const result = calculateBillTotals({ items: [] });
  assert.equal(result.subtotal, "0.00");
  assert.equal(result.grandTotal, "0.00");
});

test("Single item with fractional quantity", () => {
  const result = calculateBillTotals({
    items: [{ unitPrice: 120, quantity: 2.5 }],
    taxEnabled: false,
  });
  assert.equal(result.subtotal, "300.00");
  assert.equal(result.grandTotal, "300.00");
});

test("Fixed discount correctly reduces taxable base", () => {
  const result = calculateBillTotals({
    items: [
      { unitPrice: 100, quantity: 2 },
      { unitPrice: 50, quantity: 1 },
    ],
    discountType: "FIXED",
    discountValue: 25,
    taxEnabled: false,
  });
  assert.equal(result.subtotal, "250.00");
  assert.equal(result.discountAmount, "25.00");
  assert.equal(result.taxableAmount, "225.00");
  assert.equal(result.grandTotal, "225.00");
});

test("Fixed discount exceeding subtotal is capped at subtotal", () => {
  const result = calculateBillTotals({
    items: [{ unitPrice: 100, quantity: 1 }],
    discountType: "FIXED",
    discountValue: 150,
  });
  assert.equal(result.subtotal, "100.00");
  assert.equal(result.discountAmount, "100.00");
  assert.equal(result.grandTotal, "0.00");
});

test("Percentage discount and 5% GST tax-exclusive calculation", () => {
  // Items: 2 * 120 = 240, 1 * 145 = 145, 1 * 56 = 56. Subtotal = 441.00
  // Discount: 10% = 44.10. Taxable = 396.90
  // Tax (5%): 396.90 * 0.05 = 19.845 -> rounds to 19.85
  // Grand total: 396.90 + 19.85 = 416.75
  const result = calculateBillTotals({
    items: [
      { unitPrice: 120, quantity: 2 },
      { unitPrice: 145, quantity: 1 },
      { unitPrice: 56, quantity: 1 },
    ],
    discountType: "PERCENTAGE",
    discountValue: 10,
    taxEnabled: true,
    taxRate: 5,
    taxInclusive: false,
  });

  assert.equal(result.subtotal, "441.00");
  assert.equal(result.discountAmount, "44.10");
  assert.equal(result.taxableAmount, "396.90");
  assert.equal(result.taxAmount, "19.85");
  assert.equal(result.grandTotal, "416.75");
});

test("Tax-inclusive calculation produces correct split", () => {
  // Subtotal 118, Tax 18% inclusive.
  // Tax = 118 * 18 / 118 = 18.00. Grand total = 118.00
  const result = calculateBillTotals({
    items: [{ unitPrice: 118, quantity: 1 }],
    taxEnabled: true,
    taxRate: 18,
    taxInclusive: true,
  });

  assert.equal(result.subtotal, "118.00");
  assert.equal(result.taxAmount, "18.00");
  assert.equal(result.grandTotal, "118.00");
});
