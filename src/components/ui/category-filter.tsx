interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
  allCount: number;
  categoryCounts?: Record<string, number>;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelect,
  allCount,
  categoryCounts,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  const chipClass = (selected: boolean) =>
    `inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-colors ${
      selected
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
    }`;
  const countClass = (selected: boolean) =>
    `min-w-5 rounded-full px-1.5 text-center text-[10px] leading-5 tabular-nums ${
      selected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
    }`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto scroll-smooth">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selectedCategory === null}
          className={`${chipClass(selectedCategory === null)} cursor-pointer`}
        >
          <span>All</span>
          <span className={countClass(selectedCategory === null)}>{allCount}</span>
        </button>
        {categories.map((category) => {
          const selected = selectedCategory === category;
          const count = categoryCounts?.[category];
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(selected ? null : category)}
              aria-pressed={selected}
              className={`${chipClass(selected)} cursor-pointer`}
            >
              <span>{category}</span>
              {count !== undefined && (
                <span className={countClass(selected)}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
