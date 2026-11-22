"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, Search, X } from "lucide-react";

interface AppSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  isSearching?: boolean;
  debounceMs?: number;
}

export function AppSearch({
  value,
  onChange,
  onSearch,
  placeholder,
  ariaLabel,
  isSearching = false,
  debounceMs = 0,
}: AppSearchProps) {
  const onSearchRef = useRef(onSearch);
  const userChangedRef = useRef(false);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (debounceMs <= 0 || !userChangedRef.current) return;
    const timeout = window.setTimeout(() => {
      onSearchRef.current(value);
    }, debounceMs);
    return () => window.clearTimeout(timeout);
  }, [value, debounceMs]);

  const submit = () => onSearch(value);

  return (
    <div className="w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="relative min-w-0"
        aria-busy={isSearching}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={value}
          onChange={(event) => {
            userChangedRef.current = true;
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          data-app-search-input
          aria-label={ariaLabel}
          className="h-10 w-full min-w-0 appearance-none rounded-xl border border-slate-300 bg-white pl-9 pr-20 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onSearch("");
            }}
            aria-label="Clear search"
            className="absolute right-11 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label={isSearching ? "Searching" : "Search"}
          className="absolute right-1 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
        >
          {isSearching ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
