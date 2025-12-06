import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import StockDetail from "../components/StockDetail";
import { api } from "../utils/api";

export default function StockPage() {
  const { symbol } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const target = String(symbol || "").toUpperCase();
        const { data: response } = await api.get(`/stocks/${encodeURIComponent(target)}`);
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load stock detail", err);
          setError(err?.response?.data?.error || "Unable to load stock");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto w-full max-w-6xl p-6">
        {loading && (
          <div className="rounded border border-slate-200 bg-white p-4 text-sm text-gray-500 shadow">Loading stock data…</div>
        )}
        {!loading && error && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow">{error}</div>
        )}
        {!loading && !error && data && <StockDetail data={data} />}
      </div>
    </div>
  );
}
