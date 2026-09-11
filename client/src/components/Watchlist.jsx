import React, { useEffect, useRef, useState } from "react";
import { useToast } from "./Toast";
import { api } from "../utils/api";
import StockSymbolCombobox from "./StockSymbolCombobox";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

function formatPrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return priceFormatter.format(numeric);
}

export default function Watchlist() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [adding, setAdding] = useState(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const load = async (showLoader = false) => {
      const version = ++requestVersion.current;
      if (showLoader) setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/watchlist");
        if (!cancelled && version === requestVersion.current) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled && version === requestVersion.current) setError("Failed to load watchlist");
      } finally {
        if (!cancelled && showLoader) setLoading(false);
      }
    };

    load(true);
    const interval = window.setInterval(() => load(false), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const remove = async (id) => {
    requestVersion.current += 1;
    setBusyId(id);
    try {
      await api.delete(`/watchlist/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success("Item removed from StockDash Watchlist");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to remove item");
    } finally {
      setBusyId(null);
    }
  };

  const refresh = async (id) => {
    requestVersion.current += 1;
    setBusyId(id);
    try {
      const { data } = await api.patch(`/watchlist/${id}/refresh`);
      setItems((prev) => prev.map((i) => (i._id === id ? data : i)));
      toast.success("Quote refreshed");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to refresh quote");
    } finally {
      setBusyId(null);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!selectedStock?.symbol) {
      toast.warning("Select a stock from the suggestions first");
      return;
    }
    
    requestVersion.current += 1;
    setAdding(true);
    try {
      const { data } = await api.post("/watchlist", {
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        type: "stock"
      });
      setItems((prev) => [data, ...prev]);
      setSelectedStock(null);
      toast.success(`${selectedStock.symbol} added to your watchlist`);
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.warning(`${selectedStock.symbol} is already in your watchlist`);
      } else {
        toast.error(err?.response?.data?.error || "Failed to add item");
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <div className="bg-white p-4 rounded shadow text-sm text-gray-500 dark:bg-slate-900 dark:text-slate-400">Loading watchlist…</div>;
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addItem} className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Find a stock</label>
          <StockSymbolCombobox value={selectedStock} onChange={setSelectedStock} disabled={adding} />
        </div>
        <button
          type="submit"
          disabled={adding || !selectedStock?.symbol}
          className="self-end rounded bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {!items.length ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No items in watchlist yet. Add one above to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const disabled = busyId === it._id;
            return (
              <div key={it._id} className="flex items-center justify-between rounded border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{it.symbol}</div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">{it.name}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {it.lastProvider ? `${it.lastProvider} · ` : ""}{it.isStale ? "Cached quote" : "Updated quote"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium text-slate-900 dark:text-white">{formatPrice(it.lastPrice)}</div>
                  <button
                    type="button"
                    onClick={() => refresh(it._id)}
                    disabled={disabled}
                    className="text-sm text-blue-600 transition hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(it._id)}
                    disabled={disabled}
                    className="text-sm text-red-500 transition hover:text-red-600 disabled:opacity-50 dark:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
