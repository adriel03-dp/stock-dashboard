import React, { useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { api } from "../utils/api";

export default function StockSymbolCombobox({ value, onChange, disabled = false, autoFocus = false }) {
  const listId = useId();
  const requestId = useRef(0);
  const [query, setQuery] = useState(value?.symbol || "");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (value?.symbol && query !== value.symbol) setQuery(value.symbol);
  }, [value?.symbol]);

  useEffect(() => {
    const trimmed = query.trim();
    if (value?.symbol === trimmed.toUpperCase() || trimmed.length < 1) {
      setItems([]);
      setLoading(false);
      return undefined;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/stocks/suggestions", {
          params: { q: trimmed, limit: 10 }
        });
        if (currentRequest === requestId.current) {
          setItems(Array.isArray(data?.items) ? data.items : []);
          setOpen(true);
        }
      } catch (requestError) {
        if (currentRequest === requestId.current) {
          setItems([]);
          setError(requestError?.response?.data?.error || "Could not load stock suggestions.");
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, value?.symbol]);

  const select = (item) => {
    const selected = { symbol: item.symbol.toUpperCase(), name: item.name || item.symbol };
    setQuery(selected.symbol);
    setItems([]);
    setOpen(false);
    setError("");
    onChange(selected);
  };

  const handleInput = (event) => {
    const next = event.target.value.toUpperCase();
    setQuery(next);
    setOpen(true);
    if (value) onChange(null);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus={autoFocus}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && (loading || items.length > 0)}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          disabled={disabled}
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search by ticker or company"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        {loading && <Loader2 aria-label="Loading stock suggestions" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />}
        {!loading && value?.symbol && <Check aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />}
      </div>

      {error && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}

      {open && !loading && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          {items.map((item) => (
            <li key={`${item.symbol}-${item.region || ""}`} role="option" aria-selected={value?.symbol === item.symbol}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(item)}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{item.symbol}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.name}</span>
                </span>
                {item.region && <span className="shrink-0 text-[11px] uppercase tracking-wide text-slate-400">{item.region}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
