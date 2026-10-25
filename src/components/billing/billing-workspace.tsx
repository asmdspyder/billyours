"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  User,
  Phone,
  Percent,
  CheckCircle2,
  Printer,
  Share2,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  X,
} from "lucide-react";
import { calculateBillTotals } from "@/lib/billing-calculations";
import { completeBillAction, lookupCustomerPhoneAction } from "@/actions/billing-actions";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";

interface Item {
  id: string;
  name: string;
  category: string | null;
  unitLabel: string;
  unitPrice: number;
}

interface CartLine {
  tempId: string;
  itemId?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  unitLabel?: string;
}

interface BillingWorkspaceProps {
  business: {
    id: string;
    businessName: string;
    invoicePrefix: string;
    defaultTaxRate: string | null;
    defaultTaxLabel: string | null;
    receiptPreference: string;
  };
  initialItems: Item[];
  categories: string[];
}

export function BillingWorkspace({ business, initialItems, categories }: BillingWorkspaceProps) {
  // Catalog search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [existingCustomerFound, setExistingCustomerFound] = useState(false);

  // Discount state
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE" | null>(null);
  const [discountValue, setDiscountValue] = useState<string>("0");

  // Tax state
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState<string>(
    business.defaultTaxRate && Number(business.defaultTaxRate) > 0 ? business.defaultTaxRate : "5"
  );
  const [taxLabel, setTaxLabel] = useState(business.defaultTaxLabel || "GST");

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID">("PAID");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");

  // Custom Item Modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  // Completion & Submission state
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedBill, setCompletedBill] = useState<{
    billId: string;
    billNumber: string;
    shareToken: string;
    grandTotal: string;
  } | null>(null);

  // Filter items
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearch && matchesCat;
    });
  }, [initialItems, searchQuery, selectedCategory]);

  // Live Cart Calculations
  const totals = useMemo(() => {
    return calculateBillTotals({
      items: cart.map((c) => ({
        unitPrice: c.unitPrice,
        quantity: c.quantity,
      })),
      discountType,
      discountValue: Number(discountValue) || 0,
      taxEnabled,
      taxRate: Number(taxRate) || 0,
      taxInclusive: false,
    });
  }, [cart, discountType, discountValue, taxEnabled, taxRate]);

  // Cart actions
  const addToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.itemId === item.id);
      if (existing) {
        return prev.map((line) =>
          line.itemId === item.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          tempId: "tmp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          itemId: item.id,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: 1,
          unitLabel: item.unitLabel,
        },
      ];
    });
  };

  const updateQuantity = (tempId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.tempId === tempId) {
            const newQty = Math.max(0, line.quantity + delta);
            return { ...line, quantity: newQty };
          }
          return line;
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const removeFromCart = (tempId: string) => {
    setCart((prev) => prev.filter((line) => line.tempId !== tempId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerPhone("");
    setCustomerName("");
    setExistingCustomerFound(false);
    setDiscountType(null);
    setDiscountValue("0");
    setSubmitError(null);
  };

  // Auto-lookup phone
  const handlePhoneChange = async (val: string) => {
    setCustomerPhone(val);
    const cleaned = val.replace(/[^0-9]/g, "");
    if (cleaned.length >= 10) {
      const res = await lookupCustomerPhoneAction(val);
      if (res.found && res.customer) {
        setCustomerName(res.customer.name);
        setExistingCustomerFound(true);
      } else {
        setExistingCustomerFound(false);
      }
    } else {
      setExistingCustomerFound(false);
    }
  };

  // Add one-time custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || Number(customPrice) < 0) return;

    setCart((prev) => [
      ...prev,
      {
        tempId: "tmp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        itemId: null,
        name: customName.trim(),
        unitPrice: Number(customPrice) || 0,
        quantity: Math.max(1, Number(customQty) || 1),
        unitLabel: "item",
      },
    ]);

    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setShowCustomModal(false);
  };

  // Complete Bill Submission
  const handleCompleteBill = () => {
    if (cart.length === 0) {
      setSubmitError("Please add at least one item to complete the bill.");
      return;
    }

    setSubmitError(null);

    startTransition(async () => {
      const res = await completeBillAction({
        items: cart.map((c) => ({
          itemId: c.itemId,
          name: c.name,
          unitPrice: c.unitPrice,
          quantity: c.quantity,
        })),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        discountType,
        discountValue: Number(discountValue) || 0,
        taxEnabled,
        taxRate: Number(taxRate) || 0,
        taxLabel,
        paymentStatus,
        paymentMethod,
      });

      if (!res.success) {
        setSubmitError(res.error || "Failed to complete bill. Please check values.");
      } else if (res.billId && res.billNumber) {
        setCompletedBill({
          billId: res.billId,
          billNumber: res.billNumber,
          shareToken: res.shareToken || "",
          grandTotal: res.grandTotal || totals.grandTotal,
        });
      }
    });
  };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto">
      {/* Top Banner / Error */}
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between">
          <span>{submitError}</span>
          <button onClick={() => setSubmitError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Item Selection (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search bar & Custom item button */}
          <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Custom Item</span>
              </button>
            </div>

            {/* Category filter pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === null
                      ? "bg-blue-600 text-white font-medium shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({initialItems.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white font-medium shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Grid / List */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 shadow-sm min-h-[360px]">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-medium text-sm">No items found</p>
                <p className="text-slate-400 text-xs mt-1">
                  Try searching for another term or add a one-time custom item.
                </p>
                <button
                  onClick={() => setShowCustomModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 font-medium text-xs rounded-lg hover:bg-blue-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredItems.map((item) => {
                  const inCart = cart.find((c) => c.itemId === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`group relative p-3 rounded-lg border text-left cursor-pointer transition-all select-none ${
                        inCart
                          ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.category || item.unitLabel}
                        </span>
                        {inCart && (
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                            {inCart.quantity}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 text-sm line-clamp-2">{item.name}</p>
                      <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-slate-100">
                        <span className="font-bold text-slate-900 text-base">₹{item.unitPrice.toFixed(2)}</span>
                        <span className="text-[11px] text-blue-600 font-medium group-hover:underline">
                          + Add
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Current Bill (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 sticky top-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-slate-900 text-base">Current Bill</h2>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {cart.length} item{cart.length === 1 ? "" : "s"}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-slate-400 hover:text-red-600 font-medium transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Cart Line Items */}
            {cart.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-700 font-medium text-sm">Your bill is empty</p>
                <p className="text-slate-400 text-xs mt-1">Select items from the catalog on the left to start billing.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {cart.map((line) => (
                  <div
                    key={line.tempId}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex-1 truncate mr-2">
                      <p className="font-semibold text-slate-900 truncate">{line.name}</p>
                      <p className="text-slate-500 text-[11px]">₹{line.unitPrice.toFixed(2)} each</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Quantity decrement */}
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.tempId, -1)}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-slate-900 text-xs">{line.quantity}</span>
                      {/* Quantity increment */}
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.tempId, 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="w-16 text-right font-bold text-slate-900 ml-2">
                      ₹{(line.unitPrice * line.quantity).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(line.tempId)}
                      className="ml-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Optional Customer Details */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Customer Details <span className="text-slate-400 font-normal">(Optional)</span>
                </span>
                {existingCustomerFound && (
                  <span className="text-[11px] text-green-600 flex items-center gap-0.5 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Found in records
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Optional Discount & Optional GST/Tax */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs">
              {/* Discount Selector */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" /> Discount:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType(null);
                      setDiscountValue("0");
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      discountType === null ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("FIXED");
                      if (discountValue === "0") setDiscountValue("10");
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      discountType === "FIXED" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    ₹ Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("PERCENTAGE");
                      if (discountValue === "0") setDiscountValue("5");
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      discountType === "PERCENTAGE" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    % Percent
                  </button>
                </div>
              </div>

              {discountType && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-slate-500 text-[11px]">
                    {discountType === "FIXED" ? "Amount (₹):" : "Percentage (%):"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-20 px-2 py-1 text-right text-xs bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Optional GST / Tax Toggle (Section 11 MVP) */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-medium text-slate-700 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-slate-400" /> Add GST / Tax:
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {taxEnabled && (
                <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Preset Tax Rates:</span>
                    <div className="flex items-center gap-1">
                      {["5", "12", "18"].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setTaxRate(rate)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            taxRate === rate
                              ? "bg-blue-600 text-white"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      placeholder="Label"
                      value={taxLabel}
                      onChange={(e) => setTaxLabel(e.target.value)}
                      className="w-16 px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="w-16 px-2 py-1 text-right text-xs bg-white border border-slate-200 rounded"
                      />
                      <span className="text-slate-500 font-medium">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Status & Method */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700">Payment Status:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("PAID")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      paymentStatus === "PAID"
                        ? "bg-green-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("UNPAID")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      paymentStatus === "UNPAID"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Unpaid
                  </button>
                </div>
              </div>

              {paymentStatus === "PAID" && (
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {(["CASH", "UPI", "CARD", "OTHER"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 px-2 rounded-lg text-center font-medium text-[11px] border transition-colors ${
                        paymentMethod === method
                          ? "bg-blue-50 border-blue-600 text-blue-700 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bill Totals Summary */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>₹{totals.subtotal}</span>
              </div>
              {Number(totals.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>- ₹{totals.discountAmount}</span>
                </div>
              )}
              {taxEnabled && Number(totals.taxAmount) > 0 && (
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{taxLabel} ({totals.taxRate}%)</span>
                  <span>+ ₹{totals.taxAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900">
                <span className="font-bold text-sm">Grand Total</span>
                <span className="font-extrabold text-2xl text-blue-600">₹{totals.grandTotal}</span>
              </div>
            </div>

            {/* Complete Bill Action */}
            <button
              type="button"
              disabled={isPending || cart.length === 0}
              onClick={handleCompleteBill}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                isPending || cart.length === 0
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-500/20"
              }`}
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Bill...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Complete Bill (₹{totals.grandTotal})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* One-time Custom Item Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add One-time Custom Item</h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item / Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special repair or tailoring"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  Add to Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Completed Success Dialog (Section 13) */}
      {completedBill && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-xl">Bill Completed!</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Saved & allocated unique bill number:
              </p>
              <div className="mt-2 inline-block px-3 py-1 rounded-lg bg-slate-100 font-mono font-bold text-sm text-slate-900">
                {completedBill.billNumber}
              </div>
              <div className="mt-2 text-2xl font-black text-blue-600">
                ₹{completedBill.grandTotal}
              </div>
            </div>

            {/* Next Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {/* 1. Print Bill */}
              <Link
                href={`/app/bills/${completedBill.billId}?print=true`}
                target="_blank"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill / Receipt</span>
              </Link>

              {/* 2. WhatsApp Share */}
              {customerPhone && (
                <a
                  href={
                    buildWhatsAppShareUrl({
                      phone: customerPhone,
                      customerName,
                      businessName: business.businessName,
                      billNumber: completedBill.billNumber,
                      grandTotal: completedBill.grandTotal,
                      billLink: `${window.location.origin}/b/${completedBill.shareToken}`,
                    }) || "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </a>
              )}

              {/* 3. View Bill */}
              <Link
                href={`/app/bills/${completedBill.billId}`}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
              >
                <span>View Full Bill Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {/* 4. New Bill */}
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setCompletedBill(null);
                }}
                className="w-full py-2.5 text-blue-600 hover:text-blue-700 font-semibold text-xs mt-1"
              >
                + Start Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
