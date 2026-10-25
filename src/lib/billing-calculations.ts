/**
 * Authoritative financial calculation module for BillYours.
 * Implements strict decimal arithmetic and rounding policies.
 * Never trust client totals; all values must be recalculated on the server.
 */

export interface LineItemInput {
  unitPrice: number | string;
  quantity: number | string;
}

export interface CalculationInput {
  items: LineItemInput[];
  discountType?: "FIXED" | "PERCENTAGE" | null;
  discountValue?: number | string | null;
  taxEnabled?: boolean;
  taxRate?: number | string | null;
  taxInclusive?: boolean;
}

export interface CalculationResult {
  items: {
    unitPrice: string;
    quantity: string;
    lineSubtotal: string;
  }[];
  subtotal: string;
  discountType: "FIXED" | "PERCENTAGE" | null;
  discountValue: string;
  discountAmount: string;
  taxEnabled: boolean;
  taxRate: string;
  taxInclusive: boolean;
  taxableAmount: string;
  taxAmount: string;
  grandTotal: string;
}

/**
 * Round to 2 decimal places using half-up standard monetary rounding.
 */
export function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Format a number as a fixed 2 decimal string.
 */
export function formatMoney(num: number): string {
  return roundTo2(num).toFixed(2);
}

/**
 * Calculate line item subtotal: Round(unitPrice * quantity, 2)
 */
export function calculateLineSubtotal(unitPrice: number, quantity: number): number {
  if (unitPrice < 0 || quantity < 0 || !Number.isFinite(unitPrice) || !Number.isFinite(quantity)) {
    throw new Error("Unit price and quantity must be non-negative finite numbers");
  }
  return roundTo2(unitPrice * quantity);
}

/**
 * Comprehensive financial recalculation for a bill.
 */
export function calculateBillTotals(input: CalculationInput): CalculationResult {
  if (!input.items || input.items.length === 0) {
    return {
      items: [],
      subtotal: "0.00",
      discountType: null,
      discountValue: "0.00",
      discountAmount: "0.00",
      taxEnabled: false,
      taxRate: "0.00",
      taxInclusive: false,
      taxableAmount: "0.00",
      taxAmount: "0.00",
      grandTotal: "0.00",
    };
  }

  // 1. Calculate line subtotals
  let calculatedSubtotal = 0;
  const processedItems = input.items.map((item) => {
    const priceNum = Math.max(0, Number(item.unitPrice) || 0);
    const qtyNum = Math.max(0, Number(item.quantity) || 0);
    const lineTotal = calculateLineSubtotal(priceNum, qtyNum);
    calculatedSubtotal += lineTotal;

    return {
      unitPrice: formatMoney(priceNum),
      quantity: Number(qtyNum).toString(),
      lineSubtotal: formatMoney(lineTotal),
    };
  });

  calculatedSubtotal = roundTo2(calculatedSubtotal);

  // 2. Calculate discount
  const rawDiscountType = input.discountType === "PERCENTAGE" || input.discountType === "FIXED" ? input.discountType : null;
  const rawDiscountVal = Math.max(0, Number(input.discountValue) || 0);
  let discountAmount = 0;

  if (rawDiscountType === "FIXED") {
    // Cannot exceed subtotal
    discountAmount = Math.min(calculatedSubtotal, rawDiscountVal);
  } else if (rawDiscountType === "PERCENTAGE") {
    // Percentage capped at 100%
    const cappedPercent = Math.min(100, Math.max(0, rawDiscountVal));
    discountAmount = roundTo2(calculatedSubtotal * (cappedPercent / 100));
  }
  discountAmount = roundTo2(discountAmount);

  // Taxable base after discount
  const taxableAmount = Math.max(0, roundTo2(calculatedSubtotal - discountAmount));

  // 3. Calculate Tax
  const taxEnabled = Boolean(input.taxEnabled);
  const rawTaxRate = taxEnabled ? Math.max(0, Math.min(100, Number(input.taxRate) || 0)) : 0;
  const taxInclusive = Boolean(input.taxInclusive);

  let taxAmount = 0;
  let grandTotal = 0;

  if (taxEnabled && rawTaxRate > 0) {
    if (taxInclusive) {
      // Inclusive tax formula: Tax = TaxableBase * Rate / (100 + Rate)
      taxAmount = roundTo2((taxableAmount * rawTaxRate) / (100 + rawTaxRate));
      grandTotal = taxableAmount; // Tax is already inside the total
    } else {
      // Exclusive tax formula: Tax = Round(TaxableBase * Rate / 100, 2)
      taxAmount = roundTo2((taxableAmount * rawTaxRate) / 100);
      grandTotal = roundTo2(taxableAmount + taxAmount);
    }
  } else {
    taxAmount = 0;
    grandTotal = taxableAmount;
  }

  return {
    items: processedItems,
    subtotal: formatMoney(calculatedSubtotal),
    discountType: rawDiscountType,
    discountValue: formatMoney(rawDiscountVal),
    discountAmount: formatMoney(discountAmount),
    taxEnabled,
    taxRate: formatMoney(rawTaxRate),
    taxInclusive,
    taxableAmount: formatMoney(taxableAmount),
    taxAmount: formatMoney(taxAmount),
    grandTotal: formatMoney(grandTotal),
  };
}
