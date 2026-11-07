"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Archive,
  CheckCircle2,
  X,
  AlertCircle,
  ChevronDown,
  Percent,
  Check,
  ShieldAlert,
} from "lucide-react";
import { createItemAction, updateItemAction, archiveItemAction } from "@/actions/catalog-actions";
import { CategoryFilter } from "@/components/ui/category-filter";
import { DataTable } from "@/components/ui/data-table";
import {
  calculateItemGstPreview,
  STANDARD_GST_RATES,
  type TaxTreatment,
  type PriceType,
} from "@/lib/billing-calculations";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unitLabel: string;
  unitPrice: number;
  taxTreatment: TaxTreatment;
  gstRate: number;
  priceType: PriceType;
  hsnSacCode: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ItemsCatalogProps {
  initialItems: CatalogItem[];
  serverCategories?: string[];
  business?: {
    id: string;
    businessName: string;
    defaultTaxRate?: string | null;
    gstRegistrationType?: "REGULAR" | "COMPOSITION" | "UNREGISTERED" | null;
  };
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    currentSearch: string;
    currentCategory: string;
  };
}

// Category Combobox — shows existing categories + allows typing a new one
function CategoryCombobox({
  categories,
  value,
  onChange,
  id,
}: {
  categories: string[];
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      value.trim()
        ? categories.filter((c) => c.toLowerCase().includes(value.toLowerCase()) && c !== value)
        : categories,
    [categories, value]
  );

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          name="category"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="e.g. Beverages, Electronics (or type new)"
          autoComplete="off"
          className="w-full px-4 py-2.5 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {value.trim() && !categories.includes(value.trim()) && (
            <button
              type="button"
              onMouseDown={() => {
                onChange(value.trim());
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-blue-600 font-semibold hover:bg-blue-50 flex items-center gap-2 border-b border-slate-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Create &ldquo;{value.trim()}&rdquo;
            </button>
          )}
          {filtered.map((cat) => (
            <button
              key={cat}
              type="button"
              onMouseDown={() => {
                onChange(cat);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
            >
              {cat}
              {value === cat && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Item Form with clear 3-step GST configuration and live calculation preview
function ItemForm({
  onSubmit,
  onCancel,
  isPending,
  defaultValues,
  categories,
  mode,
  business,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
  defaultValues?: Partial<CatalogItem>;
  categories: string[];
  mode: "add" | "edit";
  business?: ItemsCatalogProps["business"];
}) {
  const [name, setName] = useState(defaultValues?.name || "");
  const [priceStr, setPriceStr] = useState(
    defaultValues?.unitPrice !== undefined ? String(defaultValues.unitPrice) : ""
  );
  const [unitLabel, setUnitLabel] = useState(defaultValues?.unitLabel || "");
  const [category, setCategory] = useState(defaultValues?.category || "");
  const [hsnSacCode, setHsnSacCode] = useState(defaultValues?.hsnSacCode || "");

  // GST Configuration State - disabled by default when adding new items
  const initialGstRate = defaultValues?.gstRate !== undefined ? Number(defaultValues.gstRate) : 18;
  const initialApplyGst =
    mode === "edit"
      ? Boolean(defaultValues?.taxTreatment === "TAXABLE" && initialGstRate > 0)
      : false; // By default GST configuration is disabled while adding items

  const [applyGst, setApplyGst] = useState<boolean>(initialApplyGst);
  const [taxTreatment, setTaxTreatment] = useState<TaxTreatment>(
    defaultValues?.taxTreatment || "TAXABLE"
  );
  const [priceType, setPriceType] = useState<PriceType>(defaultValues?.priceType || "EXCLUSIVE");
  const [gstRate, setGstRate] = useState<number>(initialGstRate);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(
    !STANDARD_GST_RATES.includes(initialGstRate as any)
  );
  const [customRateStr, setCustomRateStr] = useState<string>(
    !STANDARD_GST_RATES.includes(initialGstRate as any) ? String(initialGstRate) : ""
  );

  const isCompositionOrUnregistered =
    business?.gstRegistrationType === "COMPOSITION" ||
    business?.gstRegistrationType === "UNREGISTERED";

  // Effective rate for preview
  const effectiveGstRate = applyGst
    ? isCustomRate
      ? Math.max(0, Number(customRateStr) || 0)
      : gstRate
    : 0;

  // Live calculation preview
  const preview = useMemo(() => {
    return calculateItemGstPreview({
      unitPrice: priceStr,
      gstRate: effectiveGstRate,
      priceType,
      taxTreatment: applyGst ? taxTreatment : "EXEMPT",
      isRegisteredBusiness: !isCompositionOrUnregistered,
    });
  }, [priceStr, effectiveGstRate, priceType, applyGst, taxTreatment, isCompositionOrUnregistered]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Hidden inputs sent in FormData */}
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="taxTreatment" value={applyGst ? taxTreatment : "EXEMPT"} />
      <input type="hidden" name="gstRate" value={applyGst && taxTreatment === "TAXABLE" ? effectiveGstRate : 0} />
      <input type="hidden" name="priceType" value={priceType} />

      {/* Step 1: Item Information */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
            1. Product Information
          </label>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Product / Item Name *</label>
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wireless Mouse or Consultation"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">Entered Price (₹) *</label>
            <input
              type="number"
              name="price"
              required
              min="0"
              step="0.01"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Unit Label <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              name="unitLabel"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              placeholder="e.g. kg, visit, hrs (optional)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              Category <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <CategoryCombobox categories={categories} value={category} onChange={setCategory} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600">
              HSN / SAC Code <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              name="hsnSacCode"
              value={hsnSacCode}
              onChange={(e) => setHsnSacCode(e.target.value)}
              placeholder="e.g. 8471 or 9983"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all uppercase"
            />
          </div>
        </div>
      </div>

      {/* Step 2: GST Configuration */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              2. GST Configuration
            </label>
            <p className="text-[11px] text-slate-500">Apply GST rate and price inclusion for this item</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !applyGst;
              setApplyGst(next);
              if (next && taxTreatment !== "TAXABLE") setTaxTreatment("TAXABLE");
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
              applyGst ? "bg-blue-600" : "bg-slate-200"
            }`}
            role="switch"
            aria-checked={applyGst}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                applyGst ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {isCompositionOrUnregistered && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {business?.gstRegistrationType === "COMPOSITION"
                  ? "Composition Taxpayer Notice"
                  : "Unregistered Business Notice"}
                :
              </span>{" "}
              You cannot collect GST separately from customers on invoices. This item will be billed without separate GST addition.
            </div>
          </div>
        )}

        {!applyGst ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              <strong>No GST applied</strong>. Customer pays exactly ₹{Number(priceStr || 0).toFixed(2)}.
            </span>
          </div>
        ) : (
          <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
            {/* Tax Treatment Tabs */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Tax Treatment
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
                {(["TAXABLE", "EXEMPT", "NIL_RATED", "NON_GST"] as TaxTreatment[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTaxTreatment(t)}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      taxTreatment === t
                        ? "bg-white text-blue-700 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t === "TAXABLE"
                      ? "Taxable"
                      : t === "EXEMPT"
                      ? "Exempt"
                      : t === "NIL_RATED"
                      ? "Nil-Rated"
                      : "Non-GST"}
                  </button>
                ))}
              </div>
            </div>

            {taxTreatment === "TAXABLE" && (
              <>
                {/* GST Rate Selector */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      GST Rate Percentage
                    </label>
                    <span className="text-xs font-bold text-blue-600">{effectiveGstRate}% GST</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {STANDARD_GST_RATES.map((rate) => {
                      const isSelected = !isCustomRate && gstRate === rate;
                      return (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            setIsCustomRate(false);
                            setGstRate(rate);
                          }}
                          className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-[1.02]"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {rate}%
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCustomRate(true)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        isCustomRate
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {isCustomRate && (
                    <div className="pt-1.5 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="e.g. 7.5"
                          value={customRateStr}
                          onChange={(e) => setCustomRateStr(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">Custom GST Rate</span>
                    </div>
                  )}
                </div>

                {/* Price Type Selection Cards */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    How is GST Applied to the Price?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Inclusive Option */}
                    <button
                      type="button"
                      onClick={() => setPriceType("INCLUSIVE")}
                      className={`text-left p-3 rounded-xl border-2 transition-all flex flex-col justify-between ${
                        priceType === "INCLUSIVE"
                          ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">Price includes GST</span>
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded-md uppercase">
                          Inclusive
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        The price you enter already includes GST. We extract the tax without increasing selling price.
                      </p>
                    </button>

                    {/* Exclusive Option */}
                    <button
                      type="button"
                      onClick={() => setPriceType("EXCLUSIVE")}
                      className={`text-left p-3 rounded-xl border-2 transition-all flex flex-col justify-between ${
                        priceType === "EXCLUSIVE"
                          ? "border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">Add GST to the price</span>
                        <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-md uppercase">
                          Exclusive
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        The price you enter is before GST. GST is calculated and added on top of the selling price.
                      </p>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Live Calculation Preview */}
      <div className="bg-[#fffdf7] text-slate-800 p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 pb-1.5 border-b border-slate-200">
          <span className="font-semibold flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-blue-400" />
            Live Price & GST Preview
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
            {applyGst && taxTreatment === "TAXABLE"
              ? `${effectiveGstRate}% ${priceType === "INCLUSIVE" ? "Included" : "Extra"}`
              : "No GST"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Taxable Base</span>
            <span className="block text-sm font-bold text-slate-900 mt-0.5">
              ₹{preview.taxableValue.toFixed(2)}
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-slate-200">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">
              GST ({preview.effectiveRate}%)
            </span>
            <span className="block text-sm font-bold text-amber-700 mt-0.5">
              ₹{preview.gstAmount.toFixed(2)}
            </span>
          </div>
          <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
            <span className="block text-[10px] text-blue-700 uppercase font-bold">Customer Pays</span>
            <span className="block text-sm font-black text-blue-800 mt-0.5">
              ₹{preview.finalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending ? "Saving..." : mode === "add" ? "Save Item" : "Update Item"}
        </button>
      </div>
    </form>
  );
}

export function ItemsCatalog({ initialItems, serverCategories, business, pagination }: ItemsCatalogProps) {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [search, setSearch] = useState(pagination?.currentSearch || "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(pagination?.currentCategory || null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(() => {
    if (serverCategories && serverCategories.length > 0) return serverCategories;
    return Array.from(new Set(items.map((it) => it.category).filter(Boolean))) as string[];
  }, [serverCategories, items]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((it) => {
      if (it.category) {
        map[it.category] = (map[it.category] || 0) + 1;
      }
    });
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    if (pagination) return items; // When server pagination is active, items are already filtered by the server
    return items.filter((it) => {
      const matchSearch =
        it.name.toLowerCase().includes(search.toLowerCase()) ||
        (it.category && it.category.toLowerCase().includes(search.toLowerCase())) ||
        (it.hsnSacCode && it.hsnSacCode.toLowerCase().includes(search.toLowerCase()));
      const matchCat = selectedCategory ? it.category === selectedCategory : true;
      return matchSearch && matchCat;
    });
  }, [items, search, selectedCategory, pagination]);

  const handleCategorySelect = (c: string | null) => {
    setSelectedCategory(c);
    if (pagination) {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (c) params.set("category", c);
      params.set("page", "1");
      router.push(`/app/items?${params.toString()}`);
    }
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createItemAction(formData);
      if (res.success) {
        setShowAddModal(false);
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Failed to create item.");
      }
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await updateItemAction(editingItem.id, formData);
      if (res.success) {
        setEditingItem(null);
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Failed to update item.");
      }
    });
  };

  const handleArchive = (itemId: string, name: string) => {
    if (!confirm(`Archive "${name}"? It won't appear in New Bill, but past bills keep their snapshots.`)) return;

    startTransition(async () => {
      const res = await archiveItemAction(itemId);
      if (res.success) {
        setItems((prev) => prev.filter((it) => it.id !== itemId));
      } else {
        alert(res.error || "Failed to archive item.");
      }
    });
  };

  const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 text-red-700 text-sm rounded-xl flex items-center gap-2.5 border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Item Catalog</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage products, item-level GST rates, and price inclusion defaults
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      {/* Search and Item Count Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pagination) {
              const params = new URLSearchParams();
              if (search.trim()) params.set("search", search.trim());
              if (selectedCategory) params.set("category", selectedCategory);
              params.set("page", "1");
              router.push(`/app/items?${params.toString()}`);
            }
          }}
          className="relative flex-1 max-w-md"
        >
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, category, or HSN code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                if (pagination) {
                  const params = new URLSearchParams();
                  if (selectedCategory) params.set("category", selectedCategory);
                  params.set("page", "1");
                  router.push(`/app/items?${params.toString()}`);
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-900 font-bold">{pagination ? items.length : filtered.length}</span> of{" "}
          <span className="text-slate-900 font-bold">{pagination ? pagination.totalCount : items.length}</span> items
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={handleCategorySelect}
        allCount={pagination ? pagination.totalCount : items.length}
        categoryCounts={pagination ? undefined : categoryCounts}
      />

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold text-sm">No items found</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">
              {search || selectedCategory
                ? "Try a different search or category"
                : "Add your products with GST configurations to start billing with one tap."}
            </p>
            {!search && !selectedCategory && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card List: Fits 100% width with zero horizontal scrolling */}
            <div className="grid gap-3 bg-slate-50/70 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-colors hover:border-slate-300"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-bold text-slate-900 text-sm">{item.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {item.category && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md">
                          {item.category}
                        </span>
                      )}
                      {item.taxTreatment === "TAXABLE" && item.gstRate > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-200">
                          {item.gstRate}% {item.priceType === "INCLUSIVE" ? "Incl" : "Excl"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded">
                          No GST
                        </span>
                      )}
                      {item.hsnSacCode && (
                        <span className="text-[10px] font-mono text-slate-400">
                          #{item.hsnSacCode}
                        </span>
                      )}
                      {item.unitLabel ? (
                        <span className="text-slate-400 text-xs">/ {item.unitLabel}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-900 text-base">₹{item.unitPrice.toFixed(2)}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <button
                        onClick={() => {
                          setErrorMsg(null);
                          setEditingItem(item);
                        }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                        aria-label="Edit item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(item.id, item.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Archive"
                        aria-label="Archive item"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block">
              <DataTable
                minWidth="min-w-[900px]"
                columns={[
                  { label: "Product" },
                  { label: "Category" },
                  { label: "GST" },
                  { label: "HSN / SAC", className: "hidden xl:table-cell" },
                  { label: "Unit", className: "hidden xl:table-cell" },
                  { label: "Price", align: "right" },
                  { label: "Actions", align: "right" },
                ]}
                rows={filtered.map((item) => ({
                  key: item.id,
                  cells: [
                    <span key="name" className="font-semibold text-slate-900">{item.name}</span>,
                    item.category ? (
                      <span key="category" className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {item.category}
                      </span>
                    ) : <span key="category" className="text-slate-300">—</span>,
                    item.taxTreatment === "TAXABLE" && item.gstRate > 0 ? (
                      <span key="gst" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {item.gstRate}%
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                          item.priceType === "INCLUSIVE" ? "bg-blue-600 text-white" : "bg-blue-200 text-blue-800"
                        }`}>
                          {item.priceType === "INCLUSIVE" ? "Incl" : "Excl"}
                        </span>
                      </span>
                    ) : (
                      <span key="gst" className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {item.taxTreatment === "TAXABLE" ? "0% GST" : item.taxTreatment}
                      </span>
                    ),
                    <span key="hsn" className="font-mono text-xs text-slate-500">{item.hsnSacCode || "—"}</span>,
                    <span key="unit" className="text-xs text-slate-500">{item.unitLabel || "—"}</span>,
                    <span key="price" className="font-bold text-slate-900">₹{item.unitPrice.toFixed(2)}</span>,
                    <div key="actions" className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setEditingItem(item);
                        }}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="Edit"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(item.id, item.name)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Archive"
                        aria-label={`Archive ${item.name}`}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>,
                  ],
                }))}
              />
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="text-center text-xs text-slate-500 sm:text-left">
              Showing <span className="font-semibold text-slate-700">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{" "}
              <span className="font-semibold text-slate-700">{Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}</span> of{" "}
              <span className="font-semibold text-slate-700">{pagination.totalCount}</span> items
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
              <button
                disabled={pagination.page <= 1}
                onClick={() => {
                  const prevPage = pagination.page - 1;
                  const params = new URLSearchParams();
                  if (pagination.currentSearch) params.set("search", pagination.currentSearch);
                  if (pagination.currentCategory) params.set("category", pagination.currentCategory);
                  params.set("page", String(prevPage));
                  router.push(`/app/items?${params.toString()}`);
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600 px-1 font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  const nextPage = pagination.page + 1;
                  const params = new URLSearchParams();
                  if (pagination.currentSearch) params.set("search", pagination.currentSearch);
                  if (pagination.currentCategory) params.set("category", pagination.currentCategory);
                  params.set("page", String(nextPage));
                  router.push(`/app/items?${params.toString()}`);
                }}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Modal title="Add New Product" onClose={() => setShowAddModal(false)}>
          <ItemForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddModal(false)}
            isPending={isPending}
            categories={categories}
            mode="add"
            business={business}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <Modal title="Edit Product" onClose={() => setEditingItem(null)}>
          <ItemForm
            onSubmit={handleUpdate}
            onCancel={() => setEditingItem(null)}
            isPending={isPending}
            defaultValues={editingItem}
            categories={categories}
            mode="edit"
            business={business}
          />
        </Modal>
      )}
    </div>
  );
}
