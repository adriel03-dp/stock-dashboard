import React, { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import NewsList from "../components/NewsList";
import { LoadingMessage, ErrorMessage } from "../components/SkeletonLoaders";
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,197,94,0.15),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_100%,rgba(168,85,247,0.12),transparent_45%)]" />
      <main className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Market News"
        description="Real-time headlines and market analysis"
        icon={Newspaper}
        breadcrumb={<Breadcrumb />}
      />
      <div className="px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCategory(option.value)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                category === option.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 shadow-sm hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400" htmlFor="news-search">
              Keyword
            </label>
            <input
              id="news-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. inflation, earnings"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400" htmlFor="news-symbols">
              Symbols
            </label>
            <input
              id="news-symbols"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value.toUpperCase())}
              placeholder="AAPL, NVDA"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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

        {loading && <LoadingMessage />}
        {!loading && error && <ErrorMessage message={error} />}
        {!loading && !error && <NewsList items={items} />}
        </div>
      </div>
      </main>
    </div>
  );
}
