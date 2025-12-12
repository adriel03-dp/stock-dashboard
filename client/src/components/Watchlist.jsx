import React, { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { api } from "../utils/api";

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
  const [newSymbol, setNewSymbol] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/watchlist");
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError("Failed to load watchlist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const remove = async (id) => {
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
    if (!newSymbol.trim()) return;
    
    setAdding(true);
    try {
      const { data } = await api.post("/watchlist", {
        symbol: newSymbol.toUpperCase(),
        type: "stock"
      });
      setItems((prev) => [data, ...prev]);
      setNewSymbol("");
      toast.success(`${newSymbol.toUpperCase()} added to StockDash Watchlist`);
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.warning(`${newSymbol.toUpperCase()} is already in your StockDash Watchlist`);
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
      <form onSubmit={addItem} className="flex gap-2">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Enter stock symbol (e.g., AAPL)"
          className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={adding || !newSymbol.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
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
