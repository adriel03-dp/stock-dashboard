import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import NewsList from "../components/NewsList";
import { api } from "../utils/api";

const CATEGORY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Markets", value: "markets" },
  { label: "Economy", value: "economy" },
  { label: "Technology", value: "technology" },
  { label: "Energy", value: "energy" },
  { label: "Crypto", value: "crypto" }
];

export default function NewsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [symbols, setSymbols] = useState("");

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 30,
        category: category !== "all" ? category : undefined,
        search: search || undefined,
        symbols: symbols || undefined
      };
      const { data } = await api.get("/news/top", { params });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load news", err);
      setError(err?.response?.data?.error || "Failed to fetch news");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const onSubmit = (event) => {
    event.preventDefault();
    fetchNews();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Market News</h1>
            <p className="text-sm text-gray-500">Powered by Massive real-time headlines</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  category === option.value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 shadow-sm hover:bg-blue-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-gray-500" htmlFor="news-search">
              Keyword
            </label>
            <input
              id="news-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. inflation, earnings"
              className="mt-1 w-full rounded border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-gray-500" htmlFor="news-symbols">
              Symbols
            </label>
            <input
              id="news-symbols"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value.toUpperCase())}
              placeholder="AAPL, NVDA"
              className="mt-1 w-full rounded border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="pt-4 sm:pt-0">
            <button
              type="submit"
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </form>

        {loading && (
          <div className="rounded border border-slate-200 bg-white p-4 text-sm text-gray-500 shadow">
            Loading headlines…
          </div>
        )}

        {!loading && error && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow">
            {error}
          </div>
        )}

        {!loading && !error && <NewsList items={items} />}
      </div>
    </div>
  );
}
