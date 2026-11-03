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
    OTHER: <MoreHorizontal className="w-[0.8125rem] h-[0.8125rem]" />,
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
      <div className="px-[1rem] py-[0.625rem] md:px-[1.25rem] md:py-[0.625rem] border-b border-[#e8e5dc] space-y-[0.5rem] bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-[#2563eb]">Catalog</p>
            <h1 className="mt-[0.125rem] text-[1.125rem] md:text-[1.25rem] font-black tracking-[-0.035em] text-slate-950">Create a new bill</h1>
          </div>
          <div className="rounded-full border border-[#e7e4db] bg-[#faf9f5] px-[0.5rem] py-[0.25rem] text-[0.6875rem] font-bold text-slate-500">
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
              className="w-full h-[2.5rem] pl-[2.25rem] pr-[2.25rem] bg-[#f7f7f4] border border-[#e4e1d8] rounded-[0.75rem] text-[0.8125rem] placeholder:text-slate-400 focus:outline-none focus:ring-[0.1875rem] focus:ring-blue-500/15 focus:border-[#2563eb] focus:bg-white transition-all"
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
            className="h-[2.5rem] shrink-0 flex items-center justify-center gap-[0.375rem] px-[0.75rem] bg-[#0a0e1a] hover:bg-[#1d2539] text-white font-bold text-[0.75rem] rounded-[0.75rem] transition-all whitespace-nowrap cursor-pointer shadow-[0_0.375rem_1rem_rgba(10,14,26,0.12)] active:scale-[0.98]"
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
                  className={`text-left w-full min-w-[12rem] h-[8rem] p-[1rem] rounded-[1rem] border transition-all duration-200 active:scale-[0.98] flex flex-col justify-between relative cursor-pointer overflow-hidden group ${
                    inCart
                      ? "bg-[#edf3ff] border-[#2563eb] shadow-[0_8px_24px_rgba(37,99,235,0.10)]"
                      : "bg-white border-[#e8e5dc] shadow-[0_2px_10px_rgba(10,14,26,0.035)] hover:border-[#9db8ff] hover:shadow-[0_10px_28px_rgba(37,99,235,0.08)] hover:-translate-y-0.5"
                  }`}
                >
                  {inCart && (
                    <span
                      className="absolute right-[0.625rem] top-[0.625rem] z-20 inline-flex h-[1.375rem] items-center gap-[0.25rem] rounded-full border border-[#d7e2ff] bg-white px-[0.4375rem] text-[0.625rem] font-black tabular-nums text-[#2563eb] shadow-[0_0.25rem_0.625rem_rgba(37,99,235,0.12)]"
                      aria-label={`${inCart.quantity} selected`}
                    >
                      <span className="h-[0.375rem] w-[0.375rem] rounded-full bg-[#2563eb]" />
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="space-y-1">
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
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="font-black text-[#111827] text-[1rem] md:text-[1.0625rem] leading-none tracking-tight">₹{item.unitPrice.toFixed(2)}</p>
                    {item.unitLabel ? (
                      <span className="text-[0.6875rem] leading-none font-semibold text-slate-400 truncate ml-[0.25rem] max-w-[4rem]">/{item.unitLabel}</span>
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
    <div className="relative flex flex-col h-full min-h-0 overflow-hidden bg-[#f7f6f1] select-none">
      {/* 2. Customer Info (shrink-0) */}
      <div className="shrink-0 bg-white px-[1rem] md:px-[1.25rem] py-[0.625rem] border-b border-[#e7e4db] space-y-[0.5rem]">
        <div className="flex items-center justify-between">
          <span className="text-[0.75rem] md:text-[0.8125rem] font-black text-slate-800 flex items-center gap-[0.375rem]">
            <span className="w-[1.5rem] h-[1.5rem] rounded-[0.5rem] bg-[#edf3ff] text-[#2563eb] flex items-center justify-center"><User className="w-[0.875rem] h-[0.875rem]" /></span>
            Customer details <span className="font-semibold text-slate-400 text-[0.6875rem]">Optional</span>
          </span>
          <div className="flex items-center gap-[0.375rem]">
            <button
              type="button"
              onClick={() => setMobileTab("items")}
              className="md:hidden h-[1.75rem] px-[0.5rem] text-[0.625rem] text-[#2563eb] bg-[#edf3ff] rounded-[0.5rem] font-black cursor-pointer"
            >
              Add items
            </button>
            {(cart.length > 0 || customerPhone || customerName) && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Clear entire bill? All items and customer info will be reset.")) clearCart();
                }}
                className="h-[1.75rem] inline-flex items-center gap-[0.25rem] px-[0.5rem] text-[0.625rem] text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 border border-[#e7e4db] hover:border-red-200 rounded-[0.5rem] font-black transition-colors cursor-pointer"
                title="Clear entire bill"
              >
                <RotateCcw className="w-[0.75rem] h-[0.75rem]" /> Clear
              </button>
            )}
            {staffList && staffList.length > 0 && (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="h-[1.75rem] max-w-[7rem] text-[0.625rem] bg-[#f7f7f4] border border-[#e6e3da] rounded-[0.5rem] px-[0.375rem] font-bold text-slate-700 focus:outline-none focus:ring-[0.1875rem] focus:ring-blue-500/15 cursor-pointer"
                aria-label="Assign staff"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.isDefault ? " (Default)" : ""}</option>
                ))}
              </select>
            )}
            {isSearchingCustomer && (
              <span className="text-[0.625rem] text-blue-600 flex items-center gap-[0.25rem] font-semibold">
                <AppLoader size="sm" label="Searching" />
              </span>
            )}
            {!isSearchingCustomer && existingCustomerFound && (
              <span className="text-[0.625rem] text-green-600 flex items-center gap-[0.25rem] font-bold">
                <CheckCircle2 className="w-[0.75rem] h-[0.75rem]" /> Saved
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[0.625rem]">
          <div className="relative">
            <Phone className="w-[0.875rem] h-[0.875rem] absolute left-[0.875rem] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="tel"
              placeholder="Mobile number"
              value={customerPhone}
              autoComplete="off"
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full h-[2.75rem] pl-[2.375rem] pr-[1rem] text-[0.8125rem] bg-[#f7f7f4] border border-[#e6e3da] rounded-[0.75rem] focus:outline-none focus:ring-[0.1875rem] focus:ring-blue-500/15 focus:border-[#2563eb] focus:bg-white font-semibold"
            />
            {isSearchingCustomer && (
              <span className="absolute right-[0.625rem] top-1/2 -translate-y-1/2 pointer-events-none"><AppLoader size="sm" /></span>
            )}
          </div>
          <div className="relative">
            <User className="w-[0.875rem] h-[0.875rem] absolute left-[0.875rem] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Customer name"
              value={customerName}
              autoComplete="off"
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-[2.75rem] pl-[2.375rem] pr-[1rem] text-[0.8125rem] bg-[#f7f7f4] border border-[#e6e3da] rounded-[0.75rem] focus:outline-none focus:ring-[0.1875rem] focus:ring-blue-500/15 focus:border-[#2563eb] focus:bg-white font-semibold"
            />
          </div>
        </div>

      </div>

      {/* 3. Items in Bill (Scrollable Area) */}
      <div className="flex-1 min-h-[6rem] overflow-y-auto px-[0.75rem] py-[0.625rem] md:px-[1rem] md:py-[0.75rem] space-y-[0.625rem] thin-scroll bg-[#f7f6f1]">
        {cart.length === 0 ? (
          <div className="mx-auto flex h-full max-h-[16rem] w-full flex-col items-center justify-center rounded-[1rem] border border-dashed border-[#ddd9ce] bg-white/55 px-[1rem] text-center">
            <div className="mb-[0.75rem] w-[3rem] h-[3rem] rounded-[0.875rem] bg-[#edf3ff] flex items-center justify-center text-[#2563eb] shadow-[0_0.5rem_1.25rem_rgba(37,99,235,0.08)]">
              <ReceiptText className="w-[1.375rem] h-[1.375rem]" />
            </div>
            <p className="text-[0.875rem] font-black text-slate-800">Your bill is ready for items</p>
            <p className="mt-[0.25rem] max-w-[14rem] text-[0.75rem] font-semibold leading-[1.4] text-slate-400">Choose products from the catalog to start a new order.</p>
          </div>
        ) : (
          <div className="space-y-[0.625rem]">
            {totals.items.map((processed, idx) => {
              const line = cart[idx];
              if (!line) return null;
              const isRecent = recentlyAddedId === line.tempId;
              const isTaxable = line.taxTreatment === "TAXABLE" && Number(line.gstRate) > 0;

              return (
                <div
                  key={line.tempId}
                  className={`flex min-h-[3.875rem] items-center justify-between gap-[0.625rem] px-[0.75rem] py-[0.5rem] rounded-[0.875rem] border transition-all duration-200 ${
                    isRecent
                      ? "bg-[#edf3ff] border-[#2563eb] ring-[0.0625rem] ring-[#2563eb]/20"
                      : "bg-white hover:border-[#cbd8f4] border-[#e7e4db] shadow-[0_0.25rem_0.875rem_rgba(15,23,42,0.035)]"
                  }`}
                >
                  {/* Item info with GST badge */}
                  <div className="flex-1 min-w-0 pr-[0.25rem]">
                    <p className="font-black text-slate-950 text-[0.8125rem] md:text-[0.875rem] truncate leading-[1.25]">{line.name}</p>
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
      <div className="shrink-0 bg-white px-[1rem] md:px-[1.25rem] py-[0.5rem] border-t border-[#e7e4db] space-y-[0.25rem]">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[0.6875rem] font-black text-slate-700 flex items-center gap-[0.375rem] shrink-0">
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
                  ? "bg-[#edf3ff] text-[#2563eb]"
                  : "bg-[#f4f3ef] text-slate-500 hover:bg-[#eceae3]"
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
                className="w-[3.75rem] h-[1.875rem] px-[0.375rem] text-right text-[0.75rem] font-black bg-[#f7f7f4] border border-[#e6e3da] rounded-[0.5rem] focus:ring-[0.1875rem] focus:ring-blue-500/15 focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Dynamic GST Tax Summary Pill */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <Percent className="w-3 h-3 text-blue-600" />
            <span className="text-[0.6875rem] font-black text-slate-700">Total GST</span>
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
      <div className="shrink-0 bg-white px-[1rem] md:px-[1.25rem] py-[0.375rem] border-t border-[#e7e4db] flex items-center gap-[0.625rem]">
        <span className="w-[4.75rem] shrink-0 text-[0.6875rem] font-black text-slate-700">Payment</span>
        <div className="grid flex-1 grid-cols-4 gap-[0.25rem]">
          {(["CASH", "UPI", "CARD", "OTHER"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`h-[1.875rem] px-[0.125rem] flex items-center justify-center gap-[0.25rem] rounded-[0.5rem] text-[0.625rem] sm:text-[0.6875rem] font-black border transition-colors cursor-pointer ${
                paymentMethod === method
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-[#f8f8f5] border-[#e7e4db] text-slate-600 hover:bg-slate-100"
              }`}
            >
              {paymentIcons[method]}
              <span>{method}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6. Pinned Bottom Checkout Footer - ALWAYS VISIBLE */}
      <div className="shrink-0 bg-white border-t border-[#dedbd1] px-[1rem] md:px-[1.25rem] py-[0.375rem] shadow-[0_-0.375rem_1.25rem_rgba(15,23,42,0.045)]">
        {submitError && (
          <div className="mb-[0.375rem] px-[0.625rem] py-[0.5rem] bg-red-50 border border-red-200 text-red-700 text-[0.75rem] rounded-[0.625rem] flex items-center justify-between">
            <span>{submitError}</span>
            <button type="button" onClick={() => setSubmitError(null)}>
              <X className="w-[0.875rem] h-[0.875rem]" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-[0.75rem]">
          <div className="min-w-[7.5rem]">
            <span className="text-[0.5625rem] text-slate-400 font-black uppercase tracking-[0.14em] block leading-none mb-[0.25rem]">
              Total payable
            </span>
            <span className="text-[1.375rem] md:text-[1.5rem] font-black text-slate-950 leading-none tracking-tight">
              ₹{totals.grandTotal}
            </span>
          </div>

          <button
            type="button"
            disabled={isPending || cart.length === 0}
            onClick={handleCompleteBill}
            className={`h-[2.625rem] flex-1 rounded-[0.75rem] font-black text-[0.75rem] md:text-[0.8125rem] flex items-center justify-center gap-[0.5rem] transition-all active:scale-[0.98] cursor-pointer ${
              isPending || cart.length === 0
                ? "bg-[#e5e3dc] text-slate-400 cursor-not-allowed"
                : "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-[0_0.625rem_1.25rem_rgba(37,99,235,0.20)]"
            }`}
          >
            {isPending ? (
              <>
                <AppLoader size="sm" inverse />
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
