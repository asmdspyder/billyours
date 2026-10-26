"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ReceiptText,
  User,
  Phone,
  Percent,
  CheckCircle2,
  ShoppingBag,
  Banknote,
  QrCode,
  CreditCard,
  Tag,
  X,
  MoreHorizontal,
} from "lucide-react";
import { calculateBillTotals } from "@/lib/billing-calculations";
import { completeBillAction, lookupCustomerPhoneAction } from "@/actions/billing-actions";

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
  const router = useRouter();
  const DRAFT_STORAGE_KEY = `billyours_billing_draft_${business.id}`;

  // Mobile: which tab is active — "items" or "bill"
  const [mobileTab, setMobileTab] = useState<"items" | "bill">("items");

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

  // Payment state: only payment method (unpaid removed everywhere)
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");

  // Custom Item Modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  // Submission state
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Draft persistence state
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // ─── 1. Load saved draft from localStorage on mount ────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.cart)) setCart(parsed.cart);
        if (typeof parsed.customerPhone === "string") setCustomerPhone(parsed.customerPhone);
        if (typeof parsed.customerName === "string") setCustomerName(parsed.customerName);
        if (typeof parsed.existingCustomerFound === "boolean") {
          setExistingCustomerFound(parsed.existingCustomerFound);
        }
        if (
          parsed.discountType === "FIXED" ||
          parsed.discountType === "PERCENTAGE" ||
          parsed.discountType === null
        ) {
          setDiscountType(parsed.discountType);
        }
        if (typeof parsed.discountValue === "string") setDiscountValue(parsed.discountValue);
        if (typeof parsed.taxEnabled === "boolean") setTaxEnabled(parsed.taxEnabled);
        if (typeof parsed.taxRate === "string") setTaxRate(parsed.taxRate);
        if (typeof parsed.taxLabel === "string") setTaxLabel(parsed.taxLabel);
        if (["CASH", "UPI", "CARD", "OTHER"].includes(parsed.paymentMethod)) {
          setPaymentMethod(parsed.paymentMethod);
        }
      }
    } catch {
      // ignore corrupted data
    } finally {
      setIsDraftLoaded(true);
    }
  }, [DRAFT_STORAGE_KEY]);

  // ─── 2. Auto-save draft whenever cart or bill info changes ──────────────────
  useEffect(() => {
    if (!isDraftLoaded) return;
    try {
      if (cart.length === 0 && !customerPhone && !customerName) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } else {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            cart,
            customerPhone,
            customerName,
            existingCustomerFound,
            discountType,
            discountValue,
            taxEnabled,
            taxRate,
            taxLabel,
            paymentMethod,
          })
        );
      }
    } catch {
      // quota exceeded or private mode
    }
  }, [
    isDraftLoaded,
    DRAFT_STORAGE_KEY,
    cart,
    customerPhone,
    customerName,
    existingCustomerFound,
    discountType,
    discountValue,
    taxEnabled,
    taxRate,
    taxLabel,
    paymentMethod,
  ]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  // Category counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    initialItems.forEach((it) => {
      if (it.category) {
        map[it.category] = (map[it.category] || 0) + 1;
      }
    });
    return map;
  }, [initialItems]);

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

  // Cart actions with visual highlight
  const addToCart = (item: Item) => {
    let affectedTempId = "";

    setCart((prev) => {
      const existingIndex = prev.findIndex((l) => l.itemId === item.id);
      if (existingIndex > -1) {
        affectedTempId = prev[existingIndex].tempId;
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: copy[existingIndex].quantity + 1,
        };
        return copy;
      } else {
        const newTempId = "tmp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
        affectedTempId = newTempId;
        return [
          ...prev,
          {
            tempId: newTempId,
            itemId: item.id,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: 1,
            unitLabel: item.unitLabel,
          },
        ];
      }
    });

    if (affectedTempId) {
      setRecentlyAddedId(affectedTempId);
      setTimeout(() => setRecentlyAddedId(null), 700);
    }
  };

  const updateQuantity = (tempId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.tempId === tempId) {
            const nextQty = line.quantity + delta;
            return nextQty > 0 ? { ...line, quantity: nextQty } : null;
          }
          return line;
        })
        .filter(Boolean) as CartLine[]
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
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
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

  // Complete Bill Submission -> Navigate straight to print bill page
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
        paymentStatus: "PAID",
        paymentMethod,
      });

      if (!res.success) {
        setSubmitError(res.error || "Failed to complete bill. Please check values.");
      } else if (res.billId) {
        // Clear saved draft
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}
        // Reset local cart
        setCart([]);
        setCustomerPhone("");
        setCustomerName("");
        // Immediately navigate to the print bill page
        router.push(`/app/bills/${res.billId}`);
      }
    });
  };

  const paymentIcons = {
    CASH: <Banknote className="w-3.5 h-3.5" />,
    UPI: <QrCode className="w-3.5 h-3.5" />,
    CARD: <CreditCard className="w-3.5 h-3.5" />,
    OTHER: <MoreHorizontal className="w-3.5 h-3.5" />,
  };

  // ─── Item Catalog Panel ─────────────────────────────────────────────────────
  const renderItemsPanel = () => (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Search + Custom */}
      <div className="p-3 border-b border-slate-100 space-y-2.5 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Custom
          </button>
        </div>

        {/* Category horizontal scrolling bar */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll pb-1 pt-0.5 scroll-smooth">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === null
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  selectedCategory === null ? "bg-blue-700/60 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {initialItems.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? null : cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                      isSelected ? "bg-blue-700/60 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid of Catalog Items */}
      <div className="flex-1 overflow-y-auto p-3 thin-scroll bg-slate-50/50">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <ShoppingBag className="w-6 h-6 text-slate-300" />
            </div>
            <p className="font-bold text-slate-600 text-sm">No items found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {searchQuery
                ? `No items matching "${searchQuery}"`
                : "Add items in Items menu or use 'Custom' button above"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pb-20 md:pb-4">
            {filteredItems.map((item) => {
              const inCart = cart.find((l) => l.itemId === item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className={`relative p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.97] select-none cursor-pointer shadow-2xs ${
                    inCart
                      ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-sm"
                      : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/70 hover:shadow-xs"
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  {item.category && (
                    <span className="inline-block text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mb-1 truncate max-w-[85%]">
                      {item.category}
                    </span>
                  )}
                  <p className="font-semibold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2">
                    {item.name}
                  </p>
                  <p className="font-bold text-blue-600 text-sm sm:text-base mt-1">
                    ₹{item.unitPrice.toFixed(2)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Bill / Cart Panel (Zero-Scroll Architecture) ───────────────────────────
  const renderBillPanel = () => (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-50/60 select-none">
      {/* 1. Header (shrink-0) */}
      <div className="shrink-0 h-10 px-3.5 bg-white border-b border-slate-200/90 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-2xs">
            <ReceiptText className="w-3 h-3" />
          </div>
          <span className="font-bold text-slate-900 text-xs sm:text-sm">Current Bill</span>
          {cart.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-100 text-blue-700">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>
          )}
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="px-2 py-1 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md font-semibold transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* 2. Customer Details Card (shrink-0, PINNED AT TOP) */}
      <div className="shrink-0 bg-white px-3 py-1.5 border-b border-slate-200/80 shadow-2xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <User className="w-3 h-3 text-blue-600" />
            Customer Details <span className="font-normal text-slate-400 text-[10px]">(optional)</span>
          </span>
          {existingCustomerFound && (
            <span className="text-[10px] text-green-600 flex items-center gap-0.5 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Saved customer
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="relative">
            <Phone className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="tel"
              placeholder="Mobile number"
              value={customerPhone}
              autoComplete="off"
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
            />
          </div>
          <div className="relative">
            <User className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Customer name"
              value={customerName}
              autoComplete="off"
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
            />
          </div>
        </div>
      </div>

      {/* 3. Items in Bill (ONLY SCROLLABLE AREA IN BILL PANEL) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 thin-scroll">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-1.5">
              <ReceiptText className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-slate-700 font-bold text-xs">No items in bill</p>
            <p className="text-slate-400 text-[11px] mt-0.5">Select items from catalog to add</p>
          </div>
        ) : (
          <div className="space-y-1">
            {cart.map((line) => {
              const isRecent = recentlyAddedId === line.tempId;
              return (
                <div
                  key={line.tempId}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200 shadow-2xs ${
                    isRecent
                      ? "bg-blue-100/90 border-blue-400 ring-1 ring-blue-400/50"
                      : "bg-blue-50/80 hover:bg-blue-100/60 border-blue-200/80"
                  }`}
                >
                  {/* Item info */}
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="font-bold text-slate-900 text-xs truncate leading-snug">{line.name}</p>
                    <p className="text-slate-500 text-[10px] font-medium">₹{line.unitPrice.toFixed(2)}</p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-white border border-blue-200/80 px-1 py-0.5 rounded-md shrink-0 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.tempId, -1)}
                      className="w-4.5 h-4.5 rounded bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                      title="Decrease"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-5 text-center font-black text-slate-900 text-xs">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.tempId, 1)}
                      className="w-4.5 h-4.5 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-2xs cursor-pointer"
                      title="Increase"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-14 text-right font-black text-blue-700 text-xs shrink-0">
                    ₹{(line.unitPrice * line.quantity).toFixed(2)}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.tempId)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Discount & Tax Bar (shrink-0, PINNED AT BOTTOM) */}
      <div className="shrink-0 bg-white px-3 py-1.5 border-t border-slate-200/80 shadow-2xs space-y-1.5">
        {/* Discount Row */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-blue-600" /> Discount
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setDiscountType(null);
                setDiscountValue("0");
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                discountType === null ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                discountType === "FIXED" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                discountType === "PERCENTAGE"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              % Off
            </button>
            {discountType && (
              <input
                type="number"
                min="0"
                step="any"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-14 px-1.5 py-0.5 text-right text-xs font-bold bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Tax Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
            <Percent className="w-3 h-3 text-blue-600" /> GST / Tax
          </span>
          <div className="flex items-center gap-2">
            {taxEnabled && (
              <div className="flex items-center gap-1">
                {["5", "12", "18"].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setTaxRate(rate)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      taxRate === rate ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            )}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 5. Payment Mode Bar (shrink-0, PINNED AT BOTTOM - UNPAID LOGIC REMOVED) */}
      <div className="shrink-0 bg-white px-3 py-1.5 border-t border-slate-200/80 shadow-2xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700">Payment Mode</span>
        </div>

        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {(["CASH", "UPI", "CARD", "OTHER"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`py-1 flex flex-col items-center gap-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                paymentMethod === method
                  ? "bg-blue-50 border-blue-500 text-blue-700 shadow-2xs"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {paymentIcons[method]}
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Pinned Bottom Checkout Footer (shrink-0) - ALWAYS VISIBLE, NEVER PUSHED DOWN */}
      <div className="shrink-0 bg-white border-t-2 border-slate-200 p-2.5 sm:p-3 shadow-md space-y-1.5">
        {/* Breakdown bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
          <span>Subtotal: ₹{totals.subtotal}</span>
          <div className="flex items-center gap-2">
            {Number(totals.discountAmount) > 0 && (
              <span className="text-green-600 font-bold">Disc: −₹{totals.discountAmount}</span>
            )}
            {taxEnabled && Number(totals.taxAmount) > 0 && (
              <span className="text-slate-600 font-bold">
                {taxLabel}: +₹{totals.taxAmount}
              </span>
            )}
          </div>
        </div>

        {/* Error notification if any */}
        {submitError && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
            <span>{submitError}</span>
            <button type="button" onClick={() => setSubmitError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Grand Total & Checkout Button */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block leading-none">
              Total Payable
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-600 leading-none">
              ₹{totals.grandTotal}
            </span>
          </div>

          <button
            type="button"
            disabled={isPending || cart.length === 0}
            onClick={handleCompleteBill}
            className={`flex-1 py-2.5 px-4 rounded-xl font-black text-white text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
              isPending || cart.length === 0
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 ring-2 ring-blue-500/20"
            }`}
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Completing...</span>
              </>
            ) : (
              <>
                <ReceiptText className="w-4 h-4" />
                <span>Complete Bill</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Tablet & Desktop Layout (md+): Side-by-side ───────────────────── */}
      <div className="hidden md:grid md:grid-cols-12 gap-0 h-full min-h-0 overflow-hidden">
        {/* Left: Items (7 cols) */}
        <div className="md:col-span-7 border-r border-slate-200 flex flex-col overflow-hidden bg-white h-full min-h-0">
          {renderItemsPanel()}
        </div>

        {/* Right: Bill (5 cols) - distinct receipt background */}
        <div className="md:col-span-5 bg-slate-50/70 border-l border-slate-200/80 flex flex-col overflow-hidden h-full min-h-0">
          {renderBillPanel()}
        </div>
      </div>

      {/* ─── Mobile Layout (<md): Tab switcher, NEVER SCROLLS PAGE ─────────── */}
      <div className="md:hidden flex flex-col h-full min-h-0 overflow-hidden">
        {/* Tab Bar */}
        <div className="flex bg-white border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("items")}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              mobileTab === "items"
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Items
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("bill")}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              mobileTab === "bill"
                ? "border-blue-600 text-blue-600 bg-blue-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            Bill
            {cartCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className={`flex-1 overflow-hidden min-h-0 ${mobileTab === "bill" ? "bg-slate-50/70" : "bg-white"}`}>
          {mobileTab === "items" ? renderItemsPanel() : renderBillPanel()}
        </div>

        {/* Mobile: When on items tab, show floating "Go to Bill" if cart has items */}
        {mobileTab === "items" && cartCount > 0 && (
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-1 z-30 pointer-events-none">
            <button
              type="button"
              onClick={() => setMobileTab("bill")}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all pointer-events-auto cursor-pointer"
            >
              <ReceiptText className="w-4 h-4" />
              View Bill ({cartCount} item{cartCount !== 1 ? "s" : ""}) · ₹{totals.grandTotal}
            </button>
          </div>
        )}
      </div>

      {/* ─── Custom Item Modal ────────────────────────────────────────────────── */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-base">Add Custom Item</h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Item / Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special repair, Extra sauce"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Unit Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Add to Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
