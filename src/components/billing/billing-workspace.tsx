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
import { AppLoader } from "@/components/ui/app-loader";
import { SubscriptionExpiredScreen } from "@/components/subscription/subscription-expired-screen";

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
    ownerName?: string | null;
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
  const [showExpiredPopup, setShowExpiredPopup] = useState(false);
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
        if (
          res.error?.toLowerCase().includes("expired") ||
          res.error?.toLowerCase().includes("subscription") ||
          res.error?.toLowerCase().includes("suspended")
        ) {
          setShowExpiredPopup(true);
        } else {
          setSubmitError(res.error || "Failed to complete bill. Please check values.");
        }
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
    CASH: <Banknote className="w-[0.8125rem] h-[0.8125rem]" />,
    UPI: <QrCode className="w-[0.8125rem] h-[0.8125rem]" />,
    CARD: <CreditCard className="w-[0.8125rem] h-[0.8125rem]" />,
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
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white md:bg-[#fbfaf7]">
      {/* Search + Custom */}
      <div className="billing-items-toolbar px-[1rem] py-[0.625rem] md:px-[1.25rem] md:py-[0.625rem] border-b border-[#e8e5dc] space-y-[0.5rem] bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="billing-page-title text-[1.125rem] font-semibold tracking-[-0.025em] text-slate-950">Create a new bill</h1>
          </div>
          <div className="rounded-full border border-blue-700 bg-blue-600 px-[0.625rem] py-[0.25rem] text-[0.6875rem] font-semibold text-white shadow-sm">
            {filteredItems.length} items
          </div>
        </div>
        <div className="flex items-center gap-[0.5rem]">
          <div className="relative min-w-0 flex-1">
            <Search className="w-[0.875rem] h-[0.875rem] absolute left-[0.75rem] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by item name, category, or HSN"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="billing-item-search-input w-full h-[2.5rem] pl-[2.25rem] pr-[2.25rem] bg-white border border-slate-300 rounded-[0.625rem] text-sm placeholder:text-slate-500 focus:outline-none focus:ring-[0.1875rem] focus:ring-blue-500/15 focus:border-[#2563eb] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-[0.625rem] top-1/2 -translate-y-1/2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-[0.375rem]"
              >
                <X className="w-[0.875rem] h-[0.875rem]" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="billing-custom-item-button h-9 shrink-0 flex items-center justify-center gap-1.5 px-3 bg-[#0a0e1a] hover:bg-[#1d2539] text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-[1rem] h-[1rem]" />
            <span>Custom item</span>
          </button>
        </div>

        {/* Category horizontal scrolling bar */}
        {categories.length > 0 && (
          <div className="flex items-center gap-[0.375rem] overflow-x-auto no-scrollbar scroll-smooth border-t border-[#f0eee7] pt-[0.5rem]">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`inline-flex h-[2rem] items-center gap-[0.375rem] px-[0.75rem] rounded-full text-[0.75rem] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                selectedCategory === null
                  ? "bg-[#0a0e1a] text-white border-[#0a0e1a] shadow-[0_0.25rem_0.75rem_rgba(10,14,26,0.12)]"
                  : "bg-white text-slate-600 border-[#e5e2d9] hover:border-[#b9c9f0] hover:text-[#2563eb]"
              }`}
            >
              <span>All</span>
              <span
                className={`min-w-[1.25rem] text-center text-[0.625rem] leading-[1.125rem] rounded-full font-black tabular-nums ${
                  selectedCategory === null ? "bg-white/15 text-white" : "bg-[#f0efea] text-slate-500"
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
                  className={`inline-flex h-[2rem] items-center gap-[0.375rem] px-[0.75rem] rounded-full text-[0.75rem] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-[#0a0e1a] text-white border-[#0a0e1a] shadow-[0_0.25rem_0.75rem_rgba(10,14,26,0.12)]"
                      : "bg-white text-slate-600 border-[#e5e2d9] hover:border-[#b9c9f0] hover:text-[#2563eb]"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`min-w-[1.25rem] text-center text-[0.625rem] leading-[1.125rem] rounded-full font-black tabular-nums ${
                      isSelected ? "bg-white/15 text-white" : "bg-[#f0efea] text-slate-500"
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
      <div className="flex-1 overflow-y-auto p-[1rem] md:p-[1.25rem] thin-scroll bg-[#fbfaf7]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
              <ShoppingBag className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-700 font-bold text-sm">No items found</p>
            <p className="text-slate-400 text-xs mt-1">Try another search or add a custom item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] content-start gap-[0.875rem] md:gap-[1rem] pb-[0.5rem]">
            {filteredItems.map((item) => {
              const inCart = cart.find((l) => l.itemId === item.id);
              const isTaxable = item.taxTreatment === "TAXABLE" && (item.gstRate || 0) > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className={`text-left w-full min-w-[12rem] min-h-[8.5rem] p-[0.875rem] rounded-[1rem] border-2 transition-all duration-200 active:scale-[0.98] flex flex-col justify-between gap-2 relative cursor-pointer group ${
                    inCart
                      ? "bg-[#edf3ff] border-[#2563eb] shadow-[0_8px_24px_rgba(37,99,235,0.10)]"
                      : "bg-white border-[#d5d9e2] shadow-[0_2px_10px_rgba(10,14,26,0.035)] hover:border-[#9db8ff] hover:shadow-[0_10px_28px_rgba(37,99,235,0.08)] hover:-translate-y-0.5"
                  }`}
                >
                  {inCart && (
                    <span
                      className="absolute right-[0.625rem] top-[0.625rem] z-20 inline-flex h-[1.5rem] min-w-[1.5rem] items-center justify-center gap-[0.25rem] rounded-full border border-blue-700 bg-blue-600 px-[0.375rem] text-[0.625rem] font-bold tabular-nums text-white shadow-[0_0.25rem_0.625rem_rgba(37,99,235,0.24)]"
                      aria-label={`${inCart.quantity} selected`}
                    >
                      <span className="h-[0.375rem] w-[0.375rem] rounded-full bg-white" />
                      {inCart.quantity}
                    </span>
                  )}
                  <div className={`min-w-0 space-y-1 ${inCart ? "pr-9" : ""}`}>
                    {item.category && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[0.625rem] md:text-[0.6875rem] leading-[1rem] font-bold uppercase tracking-[0.08em] text-slate-500 bg-[#f1f0ec] px-[0.5rem] py-[0.25rem] rounded-[0.375rem] truncate max-w-full">
                          {item.category}
                        </span>
                      </div>
                    )}
                    <p className="font-extrabold text-slate-950 text-[0.875rem] md:text-[0.9375rem] leading-[1.25] line-clamp-2 pt-[0.25rem] break-words">
                      {item.name}
                    </p>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
                    <div className="flex min-w-0 items-center justify-end gap-1.5">
                      <p className="shrink-0 rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700 text-[0.9375rem] leading-none tabular-nums">
                        ₹{item.unitPrice.toFixed(2)}
                      </p>
                      {item.unitLabel ? (
                        <span className="max-w-[4rem] truncate text-[0.6875rem] leading-none font-medium text-slate-500">/{item.unitLabel}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Sticky Bar */}
      {cartCount > 0 && (
        <div className="billing-mobile-review-bar md:hidden z-30 shrink-0 border-t border-slate-300 px-2.5 py-2 shadow-[0_-3px_12px_rgba(15,23,42,0.06)]">
          <button
            type="button"
            onClick={() => setMobileTab("bill")}
            className="billing-mobile-review-button flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-200 active:bg-slate-50 cursor-pointer"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex min-h-6 shrink-0 items-center justify-center gap-1 rounded-full bg-blue-50 px-2 text-[0.625rem] font-semibold leading-none tabular-nums text-blue-700 ring-1 ring-inset ring-blue-100">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </span>
              <span className="flex shrink-0 items-baseline gap-1 font-semibold tabular-nums text-slate-900">
                <span className="text-[0.625rem] text-slate-500">₹</span>
                <span>{totals.grandTotal}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 font-semibold text-blue-700">
              <span>Review bill</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );

  // ─── Bill / Cart Panel (Zero-Scroll Architecture) ───────────────────────────
  const renderBillPanel = () => (
    <div className="relative flex flex-col h-full min-h-0 overflow-hidden bg-[#f7f6f1] select-none">
      {/* 2. Customer Info (shrink-0) */}
      <div className="shrink-0 bg-white px-[0.75rem] sm:px-[1rem] md:px-[1.25rem] py-[0.625rem] border-b border-[#e7e4db] space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#edf3ff] text-[#2563eb]">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="whitespace-nowrap text-[0.8125rem] font-semibold text-slate-800">Customer details</span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {staffList && staffList.length > 0 && (
              <span className="billing-staff-select relative inline-flex shrink-0">
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="h-7 w-[6.5rem] md:w-[8rem] appearance-none truncate rounded-lg border border-slate-300 bg-white pl-2 pr-6 text-[0.625rem] font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-[0.1875rem] focus:ring-blue-500/15 cursor-pointer"
                  aria-label="Assign staff"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{staffList.length > 1 && s.isDefault ? " (Default)" : ""}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              </span>
            )}
            {(cart.length > 0 || customerPhone || customerName) && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Clear entire bill? All items and customer info will be reset.")) clearCart();
                }}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-[0.625rem] font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer whitespace-nowrap"
                title="Clear entire bill"
                aria-label="Clear entire bill"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative min-w-0">
            <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="tel"
              placeholder="Mobile number"
              value={customerPhone}
              autoComplete="off"
              onChange={(e) => handlePhoneChange(e.target.value)}
              className={`billing-customer-input h-9 w-full min-w-0 pl-8 ${isSearchingCustomer || existingCustomerFound ? "pr-9" : "pr-2.5"} bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-[0.1875rem] focus:ring-blue-500/15 focus:border-[#2563eb] transition-colors`}
            />
            {isSearchingCustomer && (
              <span className="absolute right-[0.625rem] top-1/2 -translate-y-1/2 pointer-events-none"><AppLoader size="sm" label="Searching" /></span>
            )}
            {!isSearchingCustomer && existingCustomerFound && (
              <span className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center text-green-600" role="status" aria-label="Existing customer found" title="Saved customer">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <div className="relative min-w-0">
            <User className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Customer name"
              value={customerName}
              autoComplete="off"
              onChange={(e) => setCustomerName(e.target.value)}
              className="billing-customer-input h-9 w-full min-w-0 pl-8 pr-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-[0.1875rem] focus:ring-blue-500/15 focus:border-[#2563eb] transition-colors"
            />
          </div>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="shrink-0 flex items-center justify-between border-b border-[#e7e4db] bg-white px-[0.75rem] py-1 md:px-[1rem]">
          <span className="text-[0.6875rem] font-semibold text-slate-700">Items in bill</span>
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[0.625rem] font-semibold tabular-nums text-white shadow-sm">
            {cartCount} {cartCount === 1 ? "item" : "items"}
          </span>
        </div>
      )}

      {/* 3. Items in Bill (Scrollable Area) */}
      <div className="flex-1 min-h-[6rem] overflow-y-auto px-[0.75rem] py-[0.625rem] md:px-[1rem] md:py-[0.75rem] space-y-[0.625rem] thin-scroll bg-[#efeee8]">
        {cart.length === 0 ? (
          <div className="mx-auto flex h-full max-h-[16rem] w-full flex-col items-center justify-center rounded-[1rem] border border-dashed border-[#ddd9ce] bg-white/55 px-[1rem] text-center">
            <div className="mb-[0.75rem] w-[3rem] h-[3rem] rounded-[0.875rem] bg-[#edf3ff] flex items-center justify-center text-[#2563eb] shadow-[0_0.5rem_1.25rem_rgba(37,99,235,0.08)]">
              <ReceiptText className="w-[1.375rem] h-[1.375rem]" />
            </div>
            <p className="text-[0.875rem] font-black text-slate-800">Your bill is ready for items</p>
            <p className="mt-[0.25rem] max-w-[14rem] text-[0.75rem] font-semibold leading-[1.4] text-slate-400">Choose products from the catalog to start a new order.</p>
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
                  className={`grid min-h-[3.25rem] grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 rounded-[0.75rem] border px-2 py-1.5 transition-colors duration-200 ${
                    isRecent
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/15"
                      : "border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] hover:border-slate-300"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.75rem] font-semibold leading-4 text-slate-900">{line.name}</p>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap">
                      <span className="shrink-0 text-[0.625rem] font-medium tabular-nums text-slate-600">
                        ₹{line.unitPrice.toFixed(2)}
                      </span>
                      {isTaxable ? (
                        <span className="inline-flex shrink-0 items-center rounded border border-blue-100 bg-blue-50 px-1 py-px text-[0.5625rem] font-semibold text-blue-700">
                          {line.gstRate}% {line.priceType === "INCLUSIVE" ? "Incl" : "Excl"}
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center rounded bg-slate-100 px-1 py-px text-[0.5625rem] font-medium text-slate-500">
                          0%
                        </span>
                      )}
                      {line.hsnSacCode && (
                        <span className="truncate text-[0.5625rem] text-slate-400">#{line.hsnSacCode}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex h-7 shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.tempId, -1)}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95 cursor-pointer"
                      title="Decrease quantity"
                      aria-label={`Decrease ${line.name} quantity`}
                    >
                      <Minus className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                    <span className="min-w-[1rem] text-center text-xs font-semibold tabular-nums text-slate-900">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.tempId, 1)}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95 cursor-pointer"
                      title="Increase quantity"
                      aria-label={`Increase ${line.name} quantity`}
                    >
                      <Plus className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  </div>

                  <div className="w-[3.5rem] shrink-0 text-right">
                    <div className="text-xs font-semibold tabular-nums text-slate-900">₹{processed.lineTotal}</div>
                    {isTaxable && (
                      <div className="text-[0.5625rem] tabular-nums text-slate-400">
                        Tax: ₹{processed.totalTax}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(line.tempId)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    title="Remove item"
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout options */}
      <div className="shrink-0 space-y-1 border-t border-slate-200 bg-[#f8fafc] px-3 py-1.5">
        <div className="rounded-md border border-slate-200 bg-white px-2 py-1">
          <div className="flex min-h-7 items-center justify-between gap-2">
            <span className="flex shrink-0 items-center gap-1.5 text-[0.6875rem] font-semibold text-slate-700">
              <Tag className="h-3.5 w-3.5 text-blue-600" /> Discount
            </span>
            <div className="flex min-w-0 items-center gap-1">
              <div className="flex shrink-0 items-center rounded-md bg-slate-100 p-0.5">
                <button
                  type="button"
                  aria-pressed={discountType === null}
                  onClick={() => {
                    setDiscountType(null);
                    setDiscountValue("0");
                  }}
                  className={`h-6 rounded px-1.5 text-[0.5625rem] font-semibold transition-colors cursor-pointer ${
                    discountType === null ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  None
                </button>
                <button
                  type="button"
                  aria-pressed={discountType === "FIXED"}
                  onClick={() => {
                    setDiscountType("FIXED");
                    if (discountValue === "0") setDiscountValue("10");
                  }}
                  className={`h-6 rounded px-1.5 text-[0.5625rem] font-semibold transition-colors cursor-pointer ${
                    discountType === "FIXED" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ₹ Flat
                </button>
                <button
                  type="button"
                  aria-pressed={discountType === "PERCENTAGE"}
                  onClick={() => {
                    setDiscountType("PERCENTAGE");
                    if (discountValue === "0") setDiscountValue("5");
                  }}
                  className={`h-6 rounded px-1.5 text-[0.5625rem] font-semibold transition-colors cursor-pointer ${
                    discountType === "PERCENTAGE" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  % Off
                </button>
              </div>
              {discountType && (
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountValue}
                  aria-label={discountType === "FIXED" ? "Discount amount in rupees" : "Discount percentage"}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="h-7 w-12 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-right text-[0.6875rem] font-semibold tabular-nums text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                />
              )}
            </div>
          </div>

          <div className="mt-0.5 flex min-h-6 items-center justify-between border-t border-slate-100 pt-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Percent className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="text-[0.625rem] font-medium text-slate-600">GST</span>
              {totals.gstSummary.length > 0 && (
                <button
                  type="button"
                  aria-expanded={showTaxBreakdownModal}
                  onClick={() => setShowTaxBreakdownModal(!showTaxBreakdownModal)}
                  className="text-[0.5625rem] font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                >
                  {showTaxBreakdownModal ? "Hide details" : "View details"}
                </button>
              )}
            </div>
            <span className="text-[0.6875rem] font-semibold tabular-nums text-slate-800">₹{totals.totalTax}</span>
          </div>

          {showTaxBreakdownModal && totals.gstSummary.length > 0 && (
            <div className="mt-1 max-h-20 space-y-1 overflow-y-auto rounded-md bg-slate-50 px-2 py-1.5 text-[0.5625rem]">
              <div className="grid grid-cols-4 border-b border-slate-200 pb-1 font-semibold text-slate-500">
                <span>Rate</span>
                <span className="text-right">Taxable</span>
                <span className="text-right">{totals.isInterState ? "IGST" : "CGST+SGST"}</span>
                <span className="text-right">Tax</span>
              </div>
              {totals.gstSummary.map((grp) => (
                <div key={grp.gstRate} className="grid grid-cols-4 font-medium tabular-nums text-slate-700">
                  <span>{grp.gstRate}%</span>
                  <span className="text-right">₹{grp.taxableAmount}</span>
                  <span className="text-right">
                    {totals.isInterState
                      ? `₹${grp.igstAmount}`
                      : `₹${(Number(grp.cgstAmount) + Number(grp.sgstAmount)).toFixed(2)}`}
                  </span>
                  <span className="text-right font-semibold text-blue-700">₹{grp.totalTax}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
          <span className="w-14 shrink-0 text-[0.625rem] font-semibold text-slate-600">Payment</span>
          <div className="grid flex-1 grid-cols-3 gap-1">
            {(["CASH", "UPI", "CARD"] as const).map((method) => (
              <button
                key={method}
                type="button"
                aria-pressed={paymentMethod === method}
                onClick={() => setPaymentMethod(method)}
                className={`flex h-7 min-w-0 items-center justify-center gap-1 rounded-md border px-0.5 text-[0.5625rem] font-semibold transition-colors cursor-pointer ${
                  paymentMethod === method
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {paymentIcons[method]}
                <span className="truncate">{method}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pinned checkout footer */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-1.5">
        {submitError && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[0.6875rem] text-red-700">
            <span>{submitError}</span>
            <button type="button" onClick={() => setSubmitError(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <span className="mb-0.5 block text-[0.5625rem] font-semibold uppercase leading-none tracking-[0.1em] text-slate-500">
              Total payable
            </span>
            <span className="flex items-baseline gap-1 text-[1.25rem] font-bold leading-tight tracking-tight tabular-nums text-slate-950">
              <span className="text-[1rem] font-semibold text-slate-600">₹</span>
              <span>{totals.grandTotal}</span>
            </span>
          </div>

          <button
            type="button"
            disabled={isPending || cart.length === 0}
            onClick={handleCompleteBill}
            className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[0.6875rem] font-semibold transition-colors cursor-pointer ${
              isPending || cart.length === 0
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            {isPending ? (
              <>
                <AppLoader size="sm" inverse />
                <span>Completing...</span>
              </>
            ) : (
              <>
                <ReceiptText className="h-3.5 w-3.5 shrink-0" />
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
      <div className="hidden md:grid md:grid-cols-12 gap-3 p-3 lg:p-4 h-full min-h-0 overflow-hidden bg-[#f2f0e8]">
        {/* Left: Items (md: 6 cols, lg: 7 cols) */}
        <div className="md:col-span-6 lg:col-span-7 border border-[#e6e3da] rounded-[20px] flex flex-col overflow-hidden bg-white h-full min-h-0 shadow-[0_8px_30px_rgba(10,14,26,0.04)]">
          {renderItemsPanel()}
        </div>

        {/* Right: Bill (md: 6 cols, lg: 5 cols) */}
        <div className="md:col-span-6 lg:col-span-5 bg-[#fbfaf7] border border-[#e6e3da] rounded-[20px] flex flex-col overflow-hidden h-full min-h-0 shadow-[0_8px_30px_rgba(10,14,26,0.04)]">
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
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-[0.625rem] font-semibold leading-none tabular-nums text-white">
                {cartCount}
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
              <div className="bg-[#fffdf7] text-slate-800 p-3 rounded-xl space-y-1 text-xs border border-slate-200">
                <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase">
                  <span>Base Taxable</span>
                  <span>GST ({customPreview.effectiveRate}%)</span>
                  <span className="text-blue-700">Total</span>
                </div>
                <div className="flex justify-between font-black text-sm">
                  <span>₹{customPreview.taxableValue.toFixed(2)}</span>
                  <span className="text-amber-700">₹{customPreview.gstAmount.toFixed(2)}</span>
                  <span className="text-blue-700">₹{customPreview.finalPrice.toFixed(2)}</span>
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

      {showExpiredPopup && (
        <SubscriptionExpiredScreen
          businessName={business.businessName}
          ownerName={business.ownerName || undefined}
          accountId={business.id}
        />
      )}
    </>
  );
}
