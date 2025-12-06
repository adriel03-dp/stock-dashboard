import React, { useEffect, useState } from "react";
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

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
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to remove item";
      alert(message);
    } finally {
      setBusyId(null);
    }
  };

  const refresh = async (id) => {
    setBusyId(id);
    try {
      const { data } = await api.patch(`/watchlist/${id}/refresh`);
      setItems((prev) => prev.map((i) => (i._id === id ? data : i)));
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to refresh quote";
      alert(message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="bg-white p-4 rounded shadow text-sm text-gray-500">Loading watchlist…</div>;
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!items.length) {
    return <div className="bg-white p-4 rounded shadow">No watchlist entries yet.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const disabled = busyId === it._id;
        return (
          <div key={it._id} className="flex items-center justify-between rounded bg-white p-3 shadow">
            <div>
              <div className="font-semibold">{it.symbol}</div>
              <div className="text-sm text-gray-500">{it.name}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-medium">{formatPrice(it.lastPrice)}</div>
              <button
                type="button"
                onClick={() => refresh(it._id)}
                disabled={disabled}
                className="text-sm text-blue-600 disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => remove(it._id)}
                disabled={disabled}
                className="text-sm text-red-500 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
