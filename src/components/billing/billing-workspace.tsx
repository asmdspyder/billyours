"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ReceiptText,
  User,
  Phone,
  Tag,
  X,
  MoreHorizontal,
  ArrowRight,
  Banknote,
  QrCode,
  CreditCard,
  Percent,
  CheckCircle2,
  ShoppingBag,
  ChevronDown,
  ShieldAlert,
  UserCheck,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  calculateBillTotals,
  calculateItemGstPreview,
  INDIAN_STATES,
  STANDARD_GST_RATES,
  type TaxTreatment,
  type PriceType,
} from "@/lib/billing-calculations";
import { completeBillAction, lookupCustomerPhoneAction } from "@/actions/billing-actions";

interface Item {
  id: string;
  name: string;
  category: string | null;
  unitLabel: string;
  unitPrice: number;
  taxTreatment?: TaxTreatment;
  gstRate?: number;
  priceType?: PriceType;
  hsnSacCode?: string | null;
}

interface CartLine {
  tempId: string;
  itemId?: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  unitLabel?: string;
  taxTreatment: TaxTreatment;
  gstRate: number;
  priceType: PriceType;
  hsnSacCode?: string | null;
}

interface StaffOption {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface BillingWorkspaceProps {
  business: {
    id: string;
    businessName: string;
    invoicePrefix: string;
    defaultTaxRate: string | null;
    defaultTaxLabel: string | null;
    receiptPreference: string;
    state?: string | null;
    gstRegistrationType?: "REGULAR" | "COMPOSITION" | "UNREGISTERED" | null;
    gstin?: string | null;
  };
  initialItems: Item[];
  categories: string[];
  staffList?: StaffOption[];
}

export function BillingWorkspace({ business, initialItems, categories, staffList }: BillingWorkspaceProps) {
  const router = useRouter();
  const DRAFT_STORAGE_KEY = `billyours_billing_draft_${business.id}`;

  // Mobile: active tab — "items" or "bill"
  const [mobileTab, setMobileTab] = useState<"items" | "bill">("items");

  // Catalog search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [existingCustomerFound, setExistingCustomerFound] = useState(false);
  const [showTaxBreakdownModal, setShowTaxBreakdownModal] = useState(false);

  // Staff attribution state
  const defaultStaff = staffList?.find((s) => s.isDefault) || (staffList && staffList.length > 0 ? staffList[0] : null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaff?.id || "");

  useEffect(() => {
    if (!selectedStaffId && staffList && staffList.length > 0) {
      const def = staffList.find((s) => s.isDefault) || staffList[0];
      setSelectedStaffId(def.id);
    }
  }, [staffList, selectedStaffId]);

  // Discount state
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE" | null>(null);
  const [discountValue, setDiscountValue] = useState<string>("0");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");

  // Custom Item Modal state - GST disabled by default
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customUnit, setCustomUnit] = useState("");
  const [customHsn, setCustomHsn] = useState("");
  const [customApplyGst, setCustomApplyGst] = useState(false);
  const [customGstRate, setCustomGstRate] = useState<number>(18);
  const [customIsCustomRate, setCustomIsCustomRate] = useState(false);
  const [customCustomRateStr, setCustomCustomRateStr] = useState("");
  const [customPriceType, setCustomPriceType] = useState<PriceType>("EXCLUSIVE");
  const [customTaxTreatment, setCustomTaxTreatment] = useState<TaxTreatment>("TAXABLE");

  // Submission state
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const checkoutIdempotencyRef = useRef<string | null>(null);

  const isCompositionOrUnregistered =
    business.gstRegistrationType === "COMPOSITION" ||
    business.gstRegistrationType === "UNREGISTERED";

  // ─── 1. Load saved draft from localStorage on mount ────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.cart)) {
          const validIds = new Set(initialItems.map((it) => it.id));
          const sanitized = parsed.cart.map((line: any) => ({
            tempId: line.tempId || "tmp_" + Math.random().toString(36).substring(2, 7),
            itemId: line.itemId && validIds.has(line.itemId) ? line.itemId : null,
            name: line.name || "Item",
            unitPrice: Number(line.unitPrice) || 0,
            quantity: Number(line.quantity) || 1,
            unitLabel: line.unitLabel || "",
            taxTreatment: (line.taxTreatment || "TAXABLE") as TaxTreatment,
            gstRate: Number(line.gstRate !== undefined ? line.gstRate : 18),
            priceType: (line.priceType || "EXCLUSIVE") as PriceType,
            hsnSacCode: line.hsnSacCode || null,
          }));
          setCart(sanitized);
        }
        if (typeof parsed.customerPhone === "string") setCustomerPhone(parsed.customerPhone);
        if (typeof parsed.customerName === "string") setCustomerName(parsed.customerName);
      }
    } catch {}
  }, [DRAFT_STORAGE_KEY, initialItems]);

  // ─── 2. Auto-save draft on changes ──────────────────────────────────────────
  useEffect(() => {
    try {
      if (cart.length > 0 || customerPhone || customerName) {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            cart,
            customerPhone,
            customerName,
          })
        );
      }
    } catch {}
  }, [cart, customerPhone, customerName, DRAFT_STORAGE_KEY]);

  // Categories count
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
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.hsnSacCode && item.hsnSacCode.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory ? item.category === selectedCategory : true;
      return matchesSearch && matchesCat;
    });
  }, [initialItems, searchQuery, selectedCategory]);

  // Live Cart Calculations with Centralized GST Engine
  const totals = useMemo(() => {
    return calculateBillTotals({
      items: cart.map((c) => ({
        itemId: c.itemId,
        name: c.name,
        unitPrice: c.unitPrice,
        quantity: c.quantity,
        unitLabel: c.unitLabel,
        hsnSacCode: c.hsnSacCode,
        taxTreatment: c.taxTreatment,
        gstRate: c.gstRate,
        priceType: c.priceType,
      })),
      discountType,
      discountValue: Number(discountValue) || 0,
      supplierState: business.state || "",
      placeOfSupplyState: business.state || "",
      gstRegistrationType: business.gstRegistrationType,
    });
  }, [cart, discountType, discountValue, business]);

  // Add catalog item to cart
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
            taxTreatment: item.taxTreatment || "TAXABLE",
            gstRate: item.gstRate !== undefined ? Number(item.gstRate) : 18,
            priceType: item.priceType || "EXCLUSIVE",
            hsnSacCode: item.hsnSacCode || null,
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
      setIsSearchingCustomer(true);
      try {
        const res = await lookupCustomerPhoneAction(val);
        if (res.found && res.customer) {
          setCustomerName(res.customer.name);
          setExistingCustomerFound(true);
        } else {
          setExistingCustomerFound(false);
        }
      } catch {
        setExistingCustomerFound(false);
      } finally {
        setIsSearchingCustomer(false);
      }
    } else {
      setExistingCustomerFound(false);
    }
  };

  // Add one-time custom item with GST config
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || Number(customPrice) < 0) return;

    const rate = customApplyGst
      ? customIsCustomRate
        ? Math.max(0, Number(customCustomRateStr) || 0)
        : customGstRate
      : 0;

    setCart((prev) => [
      ...prev,
      {
        tempId: "tmp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        itemId: null,
        name: customName.trim(),
        unitPrice: Number(customPrice) || 0,
        quantity: Math.max(1, Number(customQty) || 1),
        unitLabel: customUnit.trim() || undefined,
        taxTreatment: customApplyGst ? customTaxTreatment : "EXEMPT",
        gstRate: rate,
        priceType: customPriceType,
        hsnSacCode: customHsn.trim() || null,
      },
    ]);

    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setCustomUnit("");
    setCustomHsn("");
    setCustomApplyGst(false);
    setShowCustomModal(false);
  };

  // Complete Bill Submission
  const handleCompleteBill = () => {
    if (cart.length === 0) {
      setSubmitError("Please add at least one item to complete the bill.");
      return;
    }

    setSubmitError(null);

    const currentStaff = staffList?.find((s) => s.id === selectedStaffId) || defaultStaff;

    // Generate or maintain stable idempotency key across retries and browser reloads
    if (!checkoutIdempotencyRef.current) {
      try {
        const stored = sessionStorage.getItem("pos_active_checkout_key");
        if (stored) {
          checkoutIdempotencyRef.current = stored;
        } else {
          const newKey = "pos_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
          checkoutIdempotencyRef.current = newKey;
          sessionStorage.setItem("pos_active_checkout_key", newKey);
        }
      } catch {
        checkoutIdempotencyRef.current = "pos_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      }
    }

    startTransition(async () => {
      const res = await completeBillAction({
        idempotencyKey: checkoutIdempotencyRef.current || undefined,
        items: cart.map((c) => ({
          itemId: c.itemId,
          name: c.name,
          unitPrice: c.unitPrice,
          quantity: c.quantity,
          unitLabel: c.unitLabel,
          hsnSacCode: c.hsnSacCode,
          taxTreatment: c.taxTreatment,
          gstRate: c.gstRate,
          priceType: c.priceType,
        })),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        staffId: currentStaff?.id || undefined,
        staffName: currentStaff?.name || undefined,
        placeOfSupplyState: business.state || undefined,
        discountType,
        discountValue: Number(discountValue) || 0,
        paymentStatus: "PAID",
        paymentMethod,
      });

      if (!res.success) {
        setSubmitError(res.error || "Failed to complete bill. Please check values.");
      } else if (res.billId) {
        checkoutIdempotencyRef.current = null;
        try {
          sessionStorage.removeItem("pos_active_checkout_key");
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}
        setCart([]);
        setCustomerPhone("");
        setCustomerName("");
        router.push(`/app/bills/${res.billId}${res.shareToken ? `?token=${res.shareToken}` : ""}`);
      }
    });
  };

  const paymentIcons = {
    CASH: <Banknote className="w-3.5 h-3.5" />,
    UPI: <QrCode className="w-3.5 h-3.5" />,
    CARD: <CreditCard className="w-3.5 h-3.5" />,
    OTHER: <MoreHorizontal className="w-3.5 h-3.5" />,
  };

  const cartCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  // Custom Item Live Preview
  const customEffectiveRate = customApplyGst
    ? customIsCustomRate
      ? Math.max(0, Number(customCustomRateStr) || 0)
      : customGstRate
    : 0;

  const customPreview = useMemo(() => {
    return calculateItemGstPreview({
      unitPrice: customPrice,
      gstRate: customEffectiveRate,
      priceType: customPriceType,
      taxTreatment: customApplyGst ? customTaxTreatment : "EXEMPT",
      isRegisteredBusiness: !isCompositionOrUnregistered,
    });
  }, [
    customPrice,
    customEffectiveRate,
    customPriceType,
    customApplyGst,
    customTaxTreatment,
    isCompositionOrUnregistered,
  ]);

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
              placeholder="Search products by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Custom Item</span>
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

      {/* Item Grid (scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 thin-scroll bg-slate-50/50">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
              <ShoppingBag className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-700 font-bold text-sm">No items found</p>
            <p className="text-slate-400 text-xs mt-1">Try another search or add a custom item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filteredItems.map((item) => {
              const inCart = cart.find((l) => l.itemId === item.id);
              const isTaxable = item.taxTreatment === "TAXABLE" && (item.gstRate || 0) > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className={`text-left p-3 rounded-2xl border transition-all active:scale-[0.97] flex flex-col justify-between relative cursor-pointer group shadow-2xs ${
                    inCart
                      ? "bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20"
                      : "bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-blue-300"
                  }`}
                >
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="space-y-1">
                    {item.category && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded truncate max-w-[95%]">
                          {item.category}
                        </span>
                      </div>
                    )}
                    <p className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 pt-0.5">
                      {item.name}
                    </p>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="font-extrabold text-blue-700 text-sm">₹{item.unitPrice.toFixed(2)}</p>
                    {item.unitLabel ? (
                      <span className="text-[10px] text-slate-400">/{item.unitLabel}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Sticky Bar */}
      {cartCount > 0 && (
        <div className="md:hidden shrink-0 bg-white border-t border-slate-200 p-2.5 shadow-lg z-30">
          <button
            type="button"
            onClick={() => setMobileTab("bill")}
            className="w-full py-2.5 px-3.5 rounded-xl font-black text-white text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/80 text-white font-bold text-xs">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
              <span className="text-white/95 font-bold text-xs sm:text-sm">₹{totals.grandTotal}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span>Review Item List & Bill</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileTab("items")}
            className="md:hidden px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md font-bold transition-colors cursor-pointer"
          >
            + Add Items
          </button>
          {(cart.length > 0 || customerPhone || customerName) && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Clear entire bill? All items and customer info will be reset.")) {
                  clearCart();
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-lg font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Clear entire bill (Undo)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Customer Info (shrink-0) */}
      <div className="shrink-0 bg-white px-3 py-2 border-b border-slate-200/80 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <User className="w-3 h-3 text-blue-600" />
            Customer Info <span className="font-normal text-slate-400 text-[10px]">(optional)</span>
          </span>
          {isSearchingCustomer && (
            <span className="text-[10px] text-blue-600 flex items-center gap-1 font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" /> Searching customer...
            </span>
          )}
          {!isSearchingCustomer && existingCustomerFound && (
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
              className="w-full pl-7 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
            />
            {isSearchingCustomer && (
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
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

        {/* Staff Attribution Selector */}
        {staffList && staffList.length > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-blue-600" />
              <span>Staff:</span>
            </span>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Items in Bill (Scrollable Area) */}
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
          <div className="space-y-1.5">
            {totals.items.map((processed, idx) => {
              const line = cart[idx];
              if (!line) return null;
              const isRecent = recentlyAddedId === line.tempId;
              const isTaxable = line.taxTreatment === "TAXABLE" && Number(line.gstRate) > 0;

              return (
                <div
                  key={line.tempId}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl border transition-all duration-200 shadow-2xs ${
                    isRecent
                      ? "bg-blue-100/90 border-blue-400 ring-1 ring-blue-400/50"
                      : "bg-white hover:bg-blue-50/40 border-slate-200/90"
                  }`}
                >
                  {/* Item info with GST badge */}
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="font-bold text-slate-900 text-xs truncate leading-snug">{line.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-slate-500 text-[11px] font-semibold">
                        ₹{line.unitPrice.toFixed(2)}
                      </span>
                      {isTaxable ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                          {line.gstRate}% {line.priceType === "INCLUSIVE" ? "Incl" : "Excl"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[10px]">
                          0%
                        </span>
                      )}
                      {line.hsnSacCode && (
                        <span className="text-[10px] font-mono text-slate-400">#{line.hsnSacCode}</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.tempId, -1)}
                      className="w-5 h-5 rounded bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs"
                      title="Decrease"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-5 text-center font-black text-slate-900 text-xs">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.tempId, 1)}
                      className="w-5 h-5 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-2xs cursor-pointer"
                      title="Increase"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-16 text-right shrink-0">
                    <div className="font-black text-slate-900 text-xs">₹{processed.lineTotal}</div>
                    {isTaxable && (
                      <div className="text-[10px] text-slate-400">
                        Tax: ₹{processed.totalTax}
                      </div>
                    )}
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

      {/* 4. Discount Bar (shrink-0, Pinned at Bottom) */}
      <div className="shrink-0 bg-white px-3 py-1.5 border-t border-slate-200/80 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3 text-blue-600" /> Overall Discount
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setDiscountType(null);
                setDiscountValue("0");
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                discountType === null
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                discountType === "FIXED"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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

        {/* Dynamic GST Tax Summary Pill */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <Percent className="w-3 h-3 text-blue-600" />
            <span className="text-[11px] font-bold text-slate-700">Total GST Calculated</span>
            {totals.gstSummary.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTaxBreakdownModal(!showTaxBreakdownModal)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                (View breakdown)
              </button>
            )}
          </div>
          <span className="font-extrabold text-slate-900 text-xs">
            +₹{totals.totalTax}
          </span>
        </div>

        {/* Expandable Rate-wise Breakdown if active */}
        {showTaxBreakdownModal && totals.gstSummary.length > 0 && (
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
            <div className="grid grid-cols-4 font-bold text-slate-500 text-[10px] pb-1 border-b border-slate-200">
              <span>Rate</span>
              <span className="text-right">Taxable</span>
              <span className="text-right">{totals.isInterState ? "IGST" : "CGST+SGST"}</span>
              <span className="text-right">Tax</span>
            </div>
            {totals.gstSummary.map((grp) => (
              <div key={grp.gstRate} className="grid grid-cols-4 font-semibold text-slate-800">
                <span>{grp.gstRate}%</span>
                <span className="text-right">₹{grp.taxableAmount}</span>
                <span className="text-right">
                  {totals.isInterState
                    ? `₹${grp.igstAmount}`
                    : `₹${(Number(grp.cgstAmount) + Number(grp.sgstAmount)).toFixed(2)}`}
                </span>
                <span className="text-right font-bold text-blue-700">₹{grp.totalTax}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Payment Mode Bar (shrink-0) */}
      <div className="shrink-0 bg-white px-3 py-1.5 border-t border-slate-200/80 shadow-2xs space-y-1">
        <span className="text-[10px] font-bold text-slate-700">Payment Mode</span>
        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {(["CASH", "UPI", "CARD", "OTHER"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`py-1.5 px-1 flex items-center justify-center gap-1 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors cursor-pointer ${
                paymentMethod === method
                  ? "bg-blue-50 border-blue-500 text-blue-700 shadow-2xs"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {paymentIcons[method]}
              <span>{method}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6. Pinned Bottom Checkout Footer - ALWAYS VISIBLE */}
      <div className="shrink-0 bg-white border-t-2 border-slate-200 p-2.5 sm:p-3 shadow-md space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
          <span>Subtotal: ₹{totals.subtotal}</span>
          <div className="flex items-center gap-2">
            {Number(totals.discountAmount) > 0 && (
              <span className="text-green-600 font-bold">Disc: −₹{totals.discountAmount}</span>
            )}
            <span className="text-slate-700 font-bold">
              GST: +₹{totals.totalTax}
            </span>
          </div>
        </div>

        {submitError && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
            <span>{submitError}</span>
            <button type="button" onClick={() => setSubmitError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
        {/* Left: Items (md: 6 cols, lg: 7 cols) */}
        <div className="md:col-span-6 lg:col-span-7 border-r border-slate-200 flex flex-col overflow-hidden bg-white h-full min-h-0">
          {renderItemsPanel()}
        </div>

        {/* Right: Bill (md: 6 cols, lg: 5 cols) */}
        <div className="md:col-span-6 lg:col-span-5 bg-slate-50/70 border-l border-slate-200/80 flex flex-col overflow-hidden h-full min-h-0">
          {renderBillPanel()}
        </div>
      </div>

      {/* ─── Mobile Layout (<md): Tab switcher ─────────── */}
      <div className="md:hidden flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex bg-white border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("items")}
            className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
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
            className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
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

        <div className={`flex-1 overflow-hidden min-h-0 ${mobileTab === "bill" ? "bg-slate-50/70" : "bg-white"}`}>
          {mobileTab === "items" ? renderItemsPanel() : renderBillPanel()}
        </div>
      </div>

      {/* ─── Custom Item Modal with Complete GST Options ────────────────────────── */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Custom Item to Bill</h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item / Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special repair, Installation"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Entered Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Label <span className="font-normal text-slate-400 text-[10px]">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="e.g. hrs, visit, kg (optional)"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    HSN/SAC Code (opt)
                  </label>
                  <input
                    type="text"
                    value={customHsn}
                    onChange={(e) => setCustomHsn(e.target.value)}
                    placeholder="e.g. 9983"
                    className="w-full px-3.5 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* GST Toggle */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Apply GST on this item</span>
                  <button
                    type="button"
                    onClick={() => setCustomApplyGst(!customApplyGst)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      customApplyGst ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        customApplyGst ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {customApplyGst && (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    {/* Rate Pills */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        GST Rate: {customEffectiveRate}%
                      </label>
                      <div className="grid grid-cols-6 gap-1">
                        {STANDARD_GST_RATES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setCustomIsCustomRate(false);
                              setCustomGstRate(r);
                            }}
                            className={`py-1 rounded-lg text-xs font-bold border ${
                              !customIsCustomRate && customGstRate === r
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {r}%
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCustomIsCustomRate(true)}
                          className={`py-1 rounded-lg text-xs font-bold border ${
                            customIsCustomRate
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      {customIsCustomRate && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="e.g. 7.5"
                            value={customCustomRateStr}
                            onChange={(e) => setCustomCustomRateStr(e.target.value)}
                            className="w-24 px-2.5 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg"
                          />
                          <span className="text-xs text-slate-500">% GST Rate</span>
                        </div>
                      )}
                    </div>

                    {/* Price Type choice */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Price Type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomPriceType("INCLUSIVE")}
                          className={`p-2 rounded-lg border text-left text-xs ${
                            customPriceType === "INCLUSIVE"
                              ? "border-blue-600 bg-blue-50 font-bold text-blue-900"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          Price includes GST
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomPriceType("EXCLUSIVE")}
                          className={`p-2 rounded-lg border text-left text-xs ${
                            customPriceType === "EXCLUSIVE"
                              ? "border-blue-600 bg-blue-50 font-bold text-blue-900"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          Add GST to price
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview Card */}
              <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase">
                  <span>Base Taxable</span>
                  <span>GST ({customPreview.effectiveRate}%)</span>
                  <span className="text-blue-300">Total</span>
                </div>
                <div className="flex justify-between font-black text-sm">
                  <span>₹{customPreview.taxableValue.toFixed(2)}</span>
                  <span className="text-amber-300">₹{customPreview.gstAmount.toFixed(2)}</span>
                  <span className="text-blue-400">₹{customPreview.finalPrice.toFixed(2)}</span>
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
