/**
 * Authoritative financial & GST calculation module for BillYours.
 * Implements strict decimal arithmetic via Big.js, Indian GST Act compliance,
 * item-level tax calculations, intra-state vs inter-state handling,
 * and rate-wise consolidation.
 * 
 * Never trust client totals; all values must be recalculated on the server.
 */

import Big from "big.js";

// Financial rounding configuration:
// Mode 1: ROUND_HALF_UP (standard Indian accounting & financial rounding)
Big.RM = 1;
// Division precision: 20 decimal places before rounding
Big.DP = 20;

export type TaxTreatment = "TAXABLE" | "EXEMPT" | "NIL_RATED" | "NON_GST";
export type PriceType = "INCLUSIVE" | "EXCLUSIVE";
export type GstRegistrationType = "REGULAR" | "COMPOSITION" | "UNREGISTERED";

export interface LineItemInput {
  itemId?: string | null;
  name?: string;
  unitPrice: number | string;
  quantity: number | string;
  unitLabel?: string;
  hsnSacCode?: string | null;
  taxTreatment?: TaxTreatment | string | null;
  gstRate?: number | string | null;
  priceType?: PriceType | string | null;
}

export interface CalculationInput {
  items: LineItemInput[];
  discountType?: "FIXED" | "PERCENTAGE" | null;
  discountValue?: number | string | null;
  supplierState?: string | null;
  placeOfSupplyState?: string | null;
  gstRegistrationType?: GstRegistrationType | string | null;
  // Legacy / fallback options:
  taxEnabled?: boolean;
  taxRate?: number | string | null;
  taxInclusive?: boolean;
  taxLabel?: string;
}

export interface ProcessedItemResult {
  itemId: string | null;
  name: string;
  unitLabel: string;
  hsnSacCode: string | null;
  unitPrice: string;
  quantity: string;
  grossSubtotal: string;
  allocatedDiscount: string;
  taxTreatment: TaxTreatment;
  priceType: PriceType;
  gstRate: string;
  taxableAmount: string;
  cgstRate: string;
  cgstAmount: string;
  sgstRate: string;
  sgstAmount: string;
  igstRate: string;
  igstAmount: string;
  totalTax: string;
  lineTotal: string;
  // Legacy compatibility:
  lineSubtotal: string;
}

export interface GstSummaryGroup {
  gstRate: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  totalTax: string;
}

export interface CalculationResult {
  items: ProcessedItemResult[];
  subtotal: string;
  discountType: "FIXED" | "PERCENTAGE" | null;
  discountValue: string;
  discountAmount: string;
  taxableAmount: string;
  isInterState: boolean;
  supplierState: string;
  placeOfSupplyState: string;
  totalCgst: string;
  totalSgst: string;
  totalIgst: string;
  totalTax: string;
  roundOff: string;
  grandTotal: string;
  gstSummary: GstSummaryGroup[];
  // Legacy compatibility fields:
  taxEnabled: boolean;
  taxRate: string;
  taxInclusive: boolean;
  taxAmount: string;
  taxLabel?: string;
}

/**
 * Standard Indian GST tax rates.
 */
export const STANDARD_GST_RATES = [0, 5, 12, 18, 28] as const;

/**
 * Indian States and Union Territories list for GST Place of Supply.
 */
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/**
 * Safely parse any numeric or string representation into a Big decimal instance.
 */
export function toBig(val: number | string | Big | null | undefined, defaultVal = "0"): Big {
  if (val instanceof Big) return val;
  if (val === null || val === undefined) return new Big(defaultVal);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return new Big(defaultVal);
    const clean = trimmed.replace(/[₹$,]/g, "");
    if (!clean || isNaN(Number(clean))) return new Big(defaultVal);
    try {
      return new Big(clean);
    } catch {
      return new Big(defaultVal);
    }
  }
  if (typeof val === "number") {
    if (!Number.isFinite(val)) return new Big(defaultVal);
    return new Big(val.toString());
  }
  return new Big(defaultVal);
}

/**
 * Round to 2 decimal places using half-up standard monetary rounding.
 */
export function roundTo2(num: number | string | Big): number {
  return Number(toBig(num).toFixed(2));
}

/**
 * Format a number or Big instance as a fixed 2 decimal string.
 */
export function formatMoney(val: number | string | Big): string {
  return toBig(val).toFixed(2);
}

/**
 * Calculate line item subtotal: unitPrice * quantity with exact decimal precision.
 */
export function calculateLineSubtotal(unitPrice: number | string, quantity: number | string): number {
  const price = toBig(unitPrice);
  const qty = toBig(quantity);

  if (price.lt(0) || qty.lt(0)) {
    throw new Error("Unit price and quantity must be non-negative finite numbers");
  }

  return Number(price.times(qty).toFixed(2));
}

/**
 * Live Item GST Preview calculation for UI cards and modals.
 * Used when a user edits an item or custom item and toggles GST options.
 */
export function calculateItemGstPreview(params: {
  unitPrice: number | string;
  gstRate: number | string;
  priceType: PriceType | string;
  taxTreatment?: TaxTreatment | string;
  isRegisteredBusiness?: boolean;
}): {
  enteredPrice: number;
  taxableValue: number;
  gstAmount: number;
  finalPrice: number;
  taxTreatment: TaxTreatment;
  priceType: PriceType;
  effectiveRate: number;
} {
  const enteredPriceBig = toBig(params.unitPrice);
  const safeEnteredPrice = enteredPriceBig.lt(0) ? new Big(0) : enteredPriceBig;
  
  const rawTreatment = (params.taxTreatment || "TAXABLE").toUpperCase();
  const taxTreatment: TaxTreatment =
    rawTreatment === "EXEMPT" || rawTreatment === "NIL_RATED" || rawTreatment === "NON_GST"
      ? (rawTreatment as TaxTreatment)
      : "TAXABLE";

  const priceType: PriceType = params.priceType === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";
  const rawRateBig = toBig(params.gstRate);
  const safeRateBig = rawRateBig.lt(0) ? new Big(0) : rawRateBig.gt(100) ? new Big(100) : rawRateBig;

  // If business cannot charge GST or item is exempt/nil-rated/non-gst, rate is 0
  const isTaxable = taxTreatment === "TAXABLE" && safeRateBig.gt(0) && params.isRegisteredBusiness !== false;
  const effectiveRateBig = isTaxable ? safeRateBig : new Big(0);
  const effectiveRateNum = Number(effectiveRateBig.toFixed(2));

  if (!isTaxable) {
    const formattedPrice = Number(safeEnteredPrice.toFixed(2));
    return {
      enteredPrice: formattedPrice,
      taxableValue: formattedPrice,
      gstAmount: 0,
      finalPrice: formattedPrice,
      taxTreatment,
      priceType,
      effectiveRate: 0,
    };
  }

  if (priceType === "INCLUSIVE") {
    // Taxable = enteredPrice / (1 + rate / 100)
    const divisor = new Big(1).plus(effectiveRateBig.div(100));
    const taxableBig = safeEnteredPrice.div(divisor);
    const taxableVal = Number(taxableBig.toFixed(2));
    const finalVal = Number(safeEnteredPrice.toFixed(2));
    const gstVal = Number(new Big(finalVal).minus(taxableVal).toFixed(2));

    return {
      enteredPrice: finalVal,
      taxableValue: taxableVal,
      gstAmount: gstVal,
      finalPrice: finalVal,
      taxTreatment,
      priceType,
      effectiveRate: effectiveRateNum,
    };
  } else {
    // Exclusive: Taxable = enteredPrice, Tax = Taxable * rate / 100
    const taxableVal = Number(safeEnteredPrice.toFixed(2));
    const gstBig = new Big(taxableVal).times(effectiveRateBig).div(100);
    const gstVal = Number(gstBig.toFixed(2));
    const finalVal = Number(new Big(taxableVal).plus(gstVal).toFixed(2));

    return {
      enteredPrice: taxableVal,
      taxableValue: taxableVal,
      gstAmount: gstVal,
      finalPrice: finalVal,
      taxTreatment,
      priceType,
      effectiveRate: effectiveRateNum,
    };
  }
}

/**
 * Central authoritative financial & GST recalculation for an invoice.
 * Uses Big.js decimal arithmetic throughout to eliminate IEEE 754 precision errors.
 */
export function calculateBillTotals(input: CalculationInput): CalculationResult {
  const supplierState = (input.supplierState || "").trim();
  const placeOfSupplyState = (input.placeOfSupplyState || supplierState || "").trim();

  // Determine Inter-state vs Intra-state:
  // If placeOfSupplyState is not specified or matches supplierState, it is intra-state (CGST + SGST).
  // If they differ and both are specified, it is inter-state (IGST).
  const isInterState = Boolean(
    supplierState &&
      placeOfSupplyState &&
      supplierState.toLowerCase().replace(/\s+/g, "") !==
        placeOfSupplyState.toLowerCase().replace(/\s+/g, "")
  );

  const regType: GstRegistrationType =
    input.gstRegistrationType === "COMPOSITION" || input.gstRegistrationType === "UNREGISTERED"
      ? input.gstRegistrationType
      : "REGULAR";

  // If business is UNREGISTERED or COMPOSITION, it is legally prohibited from collecting GST
  const canCollectGst = regType === "REGULAR";

  if (!input.items || input.items.length === 0) {
    return {
      items: [],
      subtotal: "0.00",
      discountType: null,
      discountValue: "0.00",
      discountAmount: "0.00",
      taxableAmount: "0.00",
      isInterState,
      supplierState,
      placeOfSupplyState,
      totalCgst: "0.00",
      totalSgst: "0.00",
      totalIgst: "0.00",
      totalTax: "0.00",
      roundOff: "0.00",
      grandTotal: "0.00",
      gstSummary: [],
      taxEnabled: false,
      taxRate: "0.00",
      taxInclusive: false,
      taxAmount: "0.00",
    };
  }

  // 1. Calculate base gross subtotal for each line with decimal safety
  let grossSubtotalBig = new Big(0);
  const lineGrossBigs: Big[] = [];

  for (const item of input.items) {
    const priceBig = toBig(item.unitPrice);
    const qtyBig = toBig(item.quantity);
    const safePrice = priceBig.lt(0) ? new Big(0) : priceBig;
    const safeQty = qtyBig.lt(0) ? new Big(0) : qtyBig;

    // Line gross subtotal rounded to 2 decimal paise
    const lineGross = new Big(safePrice.times(safeQty).toFixed(2));
    lineGrossBigs.push(lineGross);
    grossSubtotalBig = grossSubtotalBig.plus(lineGross);
  }

  // 2. Compute bill-level discount amount
  const rawDiscountType =
    input.discountType === "PERCENTAGE" || input.discountType === "FIXED"
      ? input.discountType
      : null;
  const rawDiscountValBig = toBig(input.discountValue);
  const safeDiscountValBig = rawDiscountValBig.lt(0) ? new Big(0) : rawDiscountValBig;
  let totalDiscountBig = new Big(0);

  if (rawDiscountType === "FIXED") {
    totalDiscountBig = safeDiscountValBig.gt(grossSubtotalBig)
      ? grossSubtotalBig
      : new Big(safeDiscountValBig.toFixed(2));
  } else if (rawDiscountType === "PERCENTAGE") {
    const cappedPercent = safeDiscountValBig.gt(100)
      ? new Big(100)
      : safeDiscountValBig;
    totalDiscountBig = new Big(grossSubtotalBig.times(cappedPercent).div(100).toFixed(2));
  }

  // 3. Allocate discount proportionately to line items
  // Indian GST Section 15(3): discounts reduce transaction value prior to tax calculation.
  // The sum of allocated line discounts must match totalDiscountBig exactly.
  const allocatedDiscounts: Big[] = new Array(input.items.length).fill(null).map(() => new Big(0));
  if (totalDiscountBig.gt(0) && grossSubtotalBig.gt(0)) {
    let allocatedSumBig = new Big(0);
    let maxLineIdx = 0;
    let maxLineVal = new Big(-1);

    for (let i = 0; i < input.items.length; i++) {
      if (lineGrossBigs[i].gt(maxLineVal)) {
        maxLineVal = lineGrossBigs[i];
        maxLineIdx = i;
      }
      // Line discount = Round(totalDiscount * lineGross / grossSubtotal, 2)
      const lineDisc = new Big(
        totalDiscountBig.times(lineGrossBigs[i]).div(grossSubtotalBig).toFixed(2)
      );
      allocatedDiscounts[i] = lineDisc;
      allocatedSumBig = allocatedSumBig.plus(lineDisc);
    }

    // Reconcile any rounding cent difference onto largest line
    const diff = totalDiscountBig.minus(allocatedSumBig);
    if (!diff.eq(0) && maxLineIdx >= 0) {
      allocatedDiscounts[maxLineIdx] = allocatedDiscounts[maxLineIdx].plus(diff);
    }
  }

  // 4. Process each line item with exact GST calculations
  const processedItems: ProcessedItemResult[] = [];
  const rateSummaryMap = new Map<
    string,
    { taxable: Big; cgst: Big; sgst: Big; igst: Big; totalTax: Big }
  >();

  let totalTaxableBig = new Big(0);
  let totalCgstBig = new Big(0);
  let totalSgstBig = new Big(0);
  let totalIgstBig = new Big(0);
  let grandTotalBig = new Big(0);

  for (let i = 0; i < input.items.length; i++) {
    const rawItem = input.items[i];
    const priceBig = toBig(rawItem.unitPrice);
    const qtyBig = toBig(rawItem.quantity);
    const lineGross = lineGrossBigs[i];
    const lineDiscount = allocatedDiscounts[i] || new Big(0);
    const netLine = lineGross.minus(lineDiscount).lt(0)
      ? new Big(0)
      : lineGross.minus(lineDiscount);

    // Determine GST configuration for line
    let itemTreatment: TaxTreatment = "TAXABLE";
    if (rawItem.taxTreatment) {
      const t = rawItem.taxTreatment.toUpperCase();
      if (t === "EXEMPT" || t === "NIL_RATED" || t === "NON_GST") {
        itemTreatment = t as TaxTreatment;
      }
    }

    let itemPriceType: PriceType = "EXCLUSIVE";
    if (rawItem.priceType === "INCLUSIVE" || rawItem.priceType === "EXCLUSIVE") {
      itemPriceType = rawItem.priceType;
    } else if (input.taxInclusive) {
      itemPriceType = "INCLUSIVE";
    }

    let itemRateBig = new Big(0);
    if (itemTreatment === "TAXABLE" && canCollectGst) {
      if (rawItem.gstRate !== undefined && rawItem.gstRate !== null) {
        const parsedRate = toBig(rawItem.gstRate);
        itemRateBig = parsedRate.lt(0) ? new Big(0) : parsedRate.gt(100) ? new Big(100) : parsedRate;
      } else if (input.taxEnabled && input.taxRate !== undefined && input.taxRate !== null) {
        const parsedRate = toBig(input.taxRate);
        itemRateBig = parsedRate.lt(0) ? new Big(0) : parsedRate.gt(100) ? new Big(100) : parsedRate;
      }
    }

    let lineTaxableBig: Big;
    let lineTotalTaxBig: Big;
    let lineTotalBig: Big;

    if (itemTreatment !== "TAXABLE" || itemRateBig.eq(0) || !canCollectGst) {
      // Non-taxable or 0% rate: Taxable amount is full net line, tax is 0
      lineTaxableBig = netLine;
      lineTotalTaxBig = new Big(0);
      lineTotalBig = netLine;
    } else if (itemPriceType === "INCLUSIVE") {
      // Price includes GST:
      // Taxable = Round(NetLine / (1 + Rate / 100), 2)
      const divisor = new Big(1).plus(itemRateBig.div(100));
      lineTaxableBig = new Big(netLine.div(divisor).toFixed(2));
      lineTotalTaxBig = netLine.minus(lineTaxableBig);
      lineTotalBig = netLine;
    } else {
      // Exclusive: Add GST to price:
      // Taxable = NetLine
      // Tax = Round(NetLine * Rate / 100, 2)
      lineTaxableBig = netLine;
      lineTotalTaxBig = new Big(netLine.times(itemRateBig).div(100).toFixed(2));
      lineTotalBig = lineTaxableBig.plus(lineTotalTaxBig);
    }

    // Split tax into CGST + SGST (intra-state) or IGST (inter-state)
    let cgstRateBig = new Big(0);
    let cgstAmountBig = new Big(0);
    let sgstRateBig = new Big(0);
    let sgstAmountBig = new Big(0);
    let igstRateBig = new Big(0);
    let igstAmountBig = new Big(0);

    if (lineTotalTaxBig.gt(0)) {
      if (isInterState) {
        igstRateBig = itemRateBig;
        igstAmountBig = lineTotalTaxBig;
      } else {
        cgstRateBig = itemRateBig.div(2);
        sgstRateBig = itemRateBig.div(2);
        cgstAmountBig = new Big(lineTotalTaxBig.div(2).toFixed(2));
        sgstAmountBig = lineTotalTaxBig.minus(cgstAmountBig); // Exact paise reconciliation
      }
    }

    totalTaxableBig = totalTaxableBig.plus(lineTaxableBig);
    totalCgstBig = totalCgstBig.plus(cgstAmountBig);
    totalSgstBig = totalSgstBig.plus(sgstAmountBig);
    totalIgstBig = totalIgstBig.plus(igstAmountBig);
    grandTotalBig = grandTotalBig.plus(lineTotalBig);

    // Group in GST summary map by tax rate
    const groupRateKey = itemTreatment === "TAXABLE" ? itemRateBig.toFixed(2) : "0.00";
    const existingGroup = rateSummaryMap.get(groupRateKey) || {
      taxable: new Big(0),
      cgst: new Big(0),
      sgst: new Big(0),
      igst: new Big(0),
      totalTax: new Big(0),
    };
    existingGroup.taxable = existingGroup.taxable.plus(lineTaxableBig);
    existingGroup.cgst = existingGroup.cgst.plus(cgstAmountBig);
    existingGroup.sgst = existingGroup.sgst.plus(sgstAmountBig);
    existingGroup.igst = existingGroup.igst.plus(igstAmountBig);
    existingGroup.totalTax = existingGroup.totalTax.plus(lineTotalTaxBig);
    rateSummaryMap.set(groupRateKey, existingGroup);

    processedItems.push({
      itemId: rawItem.itemId || null,
      name: rawItem.name || `Item ${i + 1}`,
      unitLabel: rawItem.unitLabel || "",
      hsnSacCode: rawItem.hsnSacCode || null,
      unitPrice: priceBig.toFixed(2),
      quantity: qtyBig.toString(),
      grossSubtotal: lineGross.toFixed(2),
      allocatedDiscount: lineDiscount.toFixed(2),
      taxTreatment: itemTreatment,
      priceType: itemPriceType,
      gstRate: itemRateBig.toFixed(2),
      taxableAmount: lineTaxableBig.toFixed(2),
      cgstRate: cgstRateBig.toFixed(2),
      cgstAmount: cgstAmountBig.toFixed(2),
      sgstRate: sgstRateBig.toFixed(2),
      sgstAmount: sgstAmountBig.toFixed(2),
      igstRate: igstRateBig.toFixed(2),
      igstAmount: igstAmountBig.toFixed(2),
      totalTax: lineTotalTaxBig.toFixed(2),
      lineTotal: lineTotalBig.toFixed(2),
      lineSubtotal: lineGross.toFixed(2),
    });
  }

  const totalTaxCombinedBig = totalCgstBig.plus(totalSgstBig).plus(totalIgstBig);

  // Generate sorted consolidated GST Summary table
  const sortedRates = Array.from(rateSummaryMap.keys()).sort((a, b) => Number(a) - Number(b));
  const gstSummary: GstSummaryGroup[] = sortedRates.map((rateStr) => {
    const grp = rateSummaryMap.get(rateStr)!;
    return {
      gstRate: rateStr,
      taxableAmount: grp.taxable.toFixed(2),
      cgstAmount: grp.cgst.toFixed(2),
      sgstAmount: grp.sgst.toFixed(2),
      igstAmount: grp.igst.toFixed(2),
      totalTax: grp.totalTax.toFixed(2),
    };
  });

  const hasAnyTax = totalTaxCombinedBig.gt(0);

  return {
    items: processedItems,
    subtotal: grossSubtotalBig.toFixed(2),
    discountType: rawDiscountType,
    discountValue: safeDiscountValBig.toFixed(2),
    discountAmount: totalDiscountBig.toFixed(2),
    taxableAmount: totalTaxableBig.toFixed(2),
    isInterState,
    supplierState,
    placeOfSupplyState,
    totalCgst: totalCgstBig.toFixed(2),
    totalSgst: totalSgstBig.toFixed(2),
    totalIgst: totalIgstBig.toFixed(2),
    totalTax: totalTaxCombinedBig.toFixed(2),
    roundOff: "0.00",
    grandTotal: grandTotalBig.toFixed(2),
    gstSummary,
    taxEnabled: hasAnyTax || Boolean(input.taxEnabled),
    taxRate: sortedRates.length === 1 ? sortedRates[0] : "0.00",
    taxInclusive: Boolean(input.taxInclusive),
    taxAmount: totalTaxCombinedBig.toFixed(2),
    taxLabel: input.taxLabel || "GST",
  };
}
