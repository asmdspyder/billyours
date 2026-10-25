"use client";

import { useState, useMemo, useTransition, useRef, useId } from "react";
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
} from "lucide-react";
import { createItemAction, updateItemAction, archiveItemAction } from "@/actions/catalog-actions";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unitLabel: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
}

interface ItemsCatalogProps {
  initialItems: CatalogItem[];
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

  const filtered = useMemo(() =>
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
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="e.g. Beverages, Snacks (or type new)"
          autoComplete="off"
          className="w-full px-4 py-3 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
              onMouseDown={() => { onChange(value.trim()); setIsOpen(false); }}
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
              onMouseDown={() => { onChange(cat); setIsOpen(false); }}
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

// Item Form (shared between add and edit modals)
function ItemForm({
  onSubmit,
  onCancel,
  isPending,
  defaultValues,
  categories,
  mode,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isPending: boolean;
  defaultValues?: Partial<CatalogItem>;
  categories: string[];
  mode: "add" | "edit";
}) {
  const [category, setCategory] = useState(defaultValues?.category || "");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">Item Name *</label>
        <input
          type="text"
          name="name"
          required
          defaultValue={defaultValues?.name || ""}
          placeholder="e.g. Masala Tea or Haircut"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Selling Price (₹) *</label>
          <input
            type="number"
            name="price"
            required
            min="0"
            step="0.01"
            placeholder="0.00"
            defaultValue={defaultValues?.unitPrice ?? ""}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Unit Label</label>
          <input
            type="text"
            name="unitLabel"
            defaultValue={defaultValues?.unitLabel || "piece"}
            placeholder="piece, kg, box..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">
          Category <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input type="hidden" name="category" value={category} />
        <CategoryCombobox
          categories={categories}
          value={category}
          onChange={setCategory}
        />
        {category && (
          <button
            type="button"
            onClick={() => setCategory("")}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear category
          </button>
        )}
      </div>

      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving..." : mode === "add" ? "Save Item" : "Update Item"}
        </button>
      </div>
    </form>
  );
}

export function ItemsCatalog({ initialItems }: ItemsCatalogProps) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((it) => it.category).filter(Boolean))) as string[];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        it.name.toLowerCase().includes(search.toLowerCase()) ||
        (it.category && it.category.toLowerCase().includes(search.toLowerCase()));
      const matchCat = selectedCategory ? it.category === selectedCategory : true;
      return matchSearch && matchCat;
    });
  }, [items, search, selectedCategory]);

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
            Save products with prices for fast one-tap billing
          </p>
        </div>
        <button
          onClick={() => { setErrorMsg(null); setShowAddModal(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add New Item
        </button>
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === null ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All ({items.length})
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c === selectedCategory ? null : c)}
                className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === c ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold text-sm">No items found</p>
            <p className="text-slate-400 text-xs mt-1 mb-4">
              {search || selectedCategory ? "Try a different search or category" : "Add your products or services to start billing with one tap."}
            </p>
            {!search && !selectedCategory && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-semibold rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Item</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Unit</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Price</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-5 py-3.5">
                      {item.category ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs hidden sm:table-cell">{item.unitLabel}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setErrorMsg(null); setEditingItem(item); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(item.id, item.name)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Modal title="Add New Item" onClose={() => setShowAddModal(false)}>
          <ItemForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddModal(false)}
            isPending={isPending}
            categories={categories}
            mode="add"
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <Modal title="Edit Item" onClose={() => setEditingItem(null)}>
          <ItemForm
            onSubmit={handleUpdate}
            onCancel={() => setEditingItem(null)}
            isPending={isPending}
            defaultValues={editingItem}
            categories={categories}
            mode="edit"
          />
        </Modal>
      )}
    </div>
  );
}
