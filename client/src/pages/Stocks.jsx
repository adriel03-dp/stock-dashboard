import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import StocksTable from "../components/StocksTable";
import Pagination from "../components/Pagination";
import { LoadingMessage, ErrorMessage, SkeletonTable } from "../components/SkeletonLoaders";
import { useToast } from "../components/Toast";
import { api } from "../utils/api";

function getStoredLimit() {
    if (typeof window === "undefined") return 100;
    const stored = Number(window.localStorage.getItem("pref-stock-limit"));
    if (Number.isFinite(stored) && stored >= 50 && stored <= 500) return stored;
    return 100;
}

export default function Stocks() {
    const toast = useToast();
    const [pages, setPages] = useState([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingNext, setLoadingNext] = useState(false);
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(() => getStoredLimit());
    const [sortKey, setSortKey] = useState("market-cap-desc");
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [displayPageIndex, setDisplayPageIndex] = useState(0);
    const [overview, setOverview] = useState(null);
    const [filters, setFilters] = useState({
        sector: "",
        country: "",
        marketCapMin: "",
        marketCapMax: "",
        priceMin: "",
        priceMax: "",
        gainersOnly: false,
        losersOnly: false,
        highVolumeOnly: false
    });

    // Load market overview for highlights
    useEffect(() => {
        async function loadOverview() {
            setLoadingOverview(true);
            try {
                const { data } = await api.get("/market/overview");
                console.log("Market overview loaded:", data);
                setOverview(data?.highlights || data);
            } catch (err) {
                console.error("Failed to load market overview", err);
                setOverview(null);
            } finally {
                setLoadingOverview(false);
            }
        }
        loadOverview();
    }, []);

    const fetchPage = useCallback(
        async ({ cursor = null, reset = false } = {}) => {
            setError(null);
            if (reset) {
                setLoading(true);
                setPages([]);
                setPageIndex(0);
            } else {
                setLoadingNext(true);
            }

            try {
                const params = {
                    limit,
                    search: query || undefined,
                    cursor: cursor || undefined
                };

                const { data } = await api.get("/stocks", { params });
                const list = Array.isArray(data?.items) ? data.items : [];
                const nextCursor = data?.nextCursor || null;

                if (reset) {
                    setPages([{ items: list, cursorUsed: cursor, nextCursor }]);
                    setPageIndex(0);
                } else {
                    setPages((prev) => [...prev, { items: list, cursorUsed: cursor, nextCursor }]);
                    setPageIndex((prev) => prev + 1);
                }
            } catch (err) {
                console.error("Failed to fetch stocks", err);
                setError(err?.response?.data?.error || "Failed to fetch stocks");
            } finally {
                setLoading(false);
                setLoadingNext(false);
            }
        },
        [limit, query]
    );

    useEffect(() => {
        fetchPage({ reset: true });
    }, [fetchPage]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("pref-stock-limit", String(limit));
        }
    }, [limit]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const handler = (event) => {
            const nextLimit = Number(event.detail?.stockLimit);
            if (Number.isFinite(nextLimit) && nextLimit >= 50 && nextLimit <= 500) {
                setLimit((current) => (current === nextLimit ? current : nextLimit));
            }
        };
        window.addEventListener("preferences:update", handler);
        return () => {
            window.removeEventListener("preferences:update", handler);
        };
    }, []);

    const currentPage = pages[pageIndex] || { items: [], nextCursor: null };
    const totalLoaded = useMemo(() => pages.reduce((acc, page) => acc + page.items.length, 0), [pages]);
    const hasNextPage = Boolean(currentPage.nextCursor);

    const goToPage = async (index) => {
        if (index === pageIndex) return;
        if (index < pages.length) {
            setPageIndex(index);
            setDisplayPageIndex(0);
            return;
        }

        const lastPage = pages[pages.length - 1];
        if (!lastPage?.nextCursor || loadingNext) return;

        await fetchPage({ cursor: lastPage.nextCursor, reset: false });
    };

    const goToNext = () => {
        if (loadingNext) return;
        if (pageIndex + 1 < pages.length) {
            setPageIndex(pageIndex + 1);
            setDisplayPageIndex(0);
            return;
        }
        const lastPage = pages[pages.length - 1];
        if (!lastPage?.nextCursor) return;
        fetchPage({ cursor: lastPage.nextCursor });
    };

    const goToPrev = () => {
        if (pageIndex === 0 || loadingNext) return;
        setPageIndex(pageIndex - 1);
        setDisplayPageIndex(0);
    };

    const updateFilter = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
        setDisplayPageIndex(0);
    };

    const filtered = useMemo(() => {
        const pageItems = currentPage.items || [];
        const term = query.trim().toLowerCase();
        const {
            sector,
            country,
            marketCapMin,
            marketCapMax,
            priceMin,
            priceMax,
            gainersOnly,
            losersOnly,
            highVolumeOnly
        } = filters;

        let list = pageItems.filter((item) => {
            if (term) {
                const symbol = item.symbol?.toLowerCase() ?? "";
                const name = item.name?.toLowerCase() ?? "";
                if (!symbol.includes(term) && !name.includes(term)) return false;
            }
            if (sector && item.sector && !item.sector.toLowerCase().includes(sector.toLowerCase())) return false;
            if (country && item.country && !item.country.toLowerCase().includes(country.toLowerCase())) return false;

            const marketCap = Number(item.marketCap ?? Number.NaN);
            if (marketCapMin && (!Number.isFinite(marketCap) || marketCap < Number(marketCapMin))) return false;
            if (marketCapMax && (!Number.isFinite(marketCap) || marketCap > Number(marketCapMax))) return false;

            const price = Number(item.price ?? Number.NaN);
            if (priceMin && (!Number.isFinite(price) || price < Number(priceMin))) return false;
            if (priceMax && (!Number.isFinite(price) || price > Number(priceMax))) return false;

            const changePercent = Number(item.changePercent ?? Number.NaN);
            if (gainersOnly && (!Number.isFinite(changePercent) || changePercent <= 0)) return false;
            if (losersOnly && (!Number.isFinite(changePercent) || changePercent >= 0)) return false;

            const volume = Number(item.volume ?? Number.NaN);
            if (highVolumeOnly && (!Number.isFinite(volume) || volume < 1_000_000)) return false;

            return true;
        });

        const sorters = {
            "price-desc": (a, b) => (Number(b.price ?? -Infinity) || -Infinity) - (Number(a.price ?? -Infinity) || -Infinity),
            "price-asc": (a, b) => (Number(a.price ?? Infinity) || Infinity) - (Number(b.price ?? Infinity) || Infinity),
            "change-desc": (a, b) => (Number(b.changePercent ?? -Infinity) || -Infinity) - (Number(a.changePercent ?? -Infinity) || -Infinity),
            "change-asc": (a, b) => (Number(a.changePercent ?? Infinity) || Infinity) - (Number(b.changePercent ?? Infinity) || Infinity),
            "volume-desc": (a, b) => (Number(b.volume ?? -Infinity) || -Infinity) - (Number(a.volume ?? -Infinity) || -Infinity),
            "volume-asc": (a, b) => (Number(a.volume ?? Infinity) || Infinity) - (Number(b.volume ?? Infinity) || Infinity),
            "market-cap-desc": (a, b) => (Number(b.marketCap ?? -Infinity) || -Infinity) - (Number(a.marketCap ?? -Infinity) || -Infinity),
            "market-cap-asc": (a, b) => (Number(a.marketCap ?? Infinity) || Infinity) - (Number(b.marketCap ?? Infinity) || Infinity),
            alphabetical: (a, b) => (a.symbol || "").localeCompare(b.symbol || "")
        };

        const sorter = sorters[sortKey];
        if (sorter) {
            list = [...list].sort(sorter);
        }

        return list;
    }, [currentPage.items, filters, sortKey, query]);

    const add = async (it) => {
        if (!it?.symbol) return;
        const numericPrice = typeof it.price === "number" ? it.price : Number(it.price);
        const payload = {
            symbol: it.symbol,
            name: it.name || it.companyName || it.symbol,
            lastPrice: Number.isFinite(numericPrice) ? numericPrice : undefined,
            type: "stock"
        };

        try {
            await api.post("/watchlist", payload);
            toast.success(`${it.symbol.toUpperCase()} added to StockDash Watchlist`);
        } catch (err) {
            if (err?.response?.status === 409) {
                toast.warning(`${it.symbol.toUpperCase()} is already in your StockDash Watchlist`);
            } else {
                toast.error(err?.response?.data?.error || "Failed to add to watchlist");
            }
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.15),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_100%,rgba(168,85,247,0.12),transparent_45%)]" />
            <main className="mx-auto w-full max-w-7xl">
                <PageHeader
                    title="Stock Market Directory"
                    description={`Browse ${filtered.length.toLocaleString()} stocks with real-time data`}
                    icon={TrendingUp}
                    breadcrumb={<Breadcrumb />}
                />
                <div className="px-4 py-8 sm:px-6">
                          <div className="space-y-6">
                        {/* Market Highlights */}
                        {loadingOverview ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                                ))}
                            </div>
                        ) : overview ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                            >
                                <MarketHighlight
                                    title="Top Gainers"
                                    icon={TrendingUp}
                                    items={overview.topGainers || []}
                                    color="emerald"
                                />
                                <MarketHighlight
                                    title="Top Losers"
                                    icon={TrendingDown}
                                    items={overview.topLosers || []}
                                    color="rose"
                                />
                                <MarketHighlight
                                    title="Most Active"
                                    icon={Activity}
                                    items={overview.mostActive || []}
                                    color="blue"
                                />
                                <MarketHighlight
                                    title="Largest by Cap"
                                    icon={Zap}
                                    items={overview.topMarketCap || []}
                                    color="amber"
                                />
                            </motion.div>
                        ) : null}

                        {/* Main Content */}
                        <div className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                                <label className="flex items-center gap-3">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">Rows / fetch</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value) || 100)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-slate-500"
                  >
                    {[50, 100, 200, 500].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">Sort by</span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-slate-500"
                  >
                    <option value="market-cap-desc">Market cap ↓</option>
                    <option value="market-cap-asc">Market cap ↑</option>
                    <option value="price-desc">Price ↓</option>
                    <option value="price-asc">Price ↑</option>
                    <option value="change-desc">% change ↓</option>
                    <option value="change-asc">% change ↑</option>
                    <option value="volume-desc">Volume ↓</option>
                    <option value="volume-asc">Volume ↑</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">Filters</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Sector</label>
                    <input
                      value={filters.sector}
                      onChange={(e) => updateFilter("sector", e.target.value)}
                      placeholder="e.g. Technology"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Country</label>
                    <input
                      value={filters.country}
                      onChange={(e) => updateFilter("country", e.target.value)}
                      placeholder="e.g. US"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Market Cap (min)</label>
                    <input
                      value={filters.marketCapMin}
                      onChange={(e) => updateFilter("marketCapMin", e.target.value)}
                      placeholder="e.g. 1000000000"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Market Cap (max)</label>
                    <input
                      value={filters.marketCapMax}
                      onChange={(e) => updateFilter("marketCapMax", e.target.value)}
                      placeholder="e.g. 50000000000"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Price (min)</label>
                    <input
                      value={filters.priceMin}
                      onChange={(e) => updateFilter("priceMin", e.target.value)}
                      placeholder="e.g. 10"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Price (max)</label>
                    <input
                      value={filters.priceMax}
                      onChange={(e) => updateFilter("priceMax", e.target.value)}
                      placeholder="e.g. 300"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.gainersOnly}
                      onChange={(e) => updateFilter("gainersOnly", e.target.checked)}
                    />
                    Gainers only
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.losersOnly}
                      onChange={(e) => updateFilter("losersOnly", e.target.checked)}
                    />
                    Losers only
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.highVolumeOnly}
                      onChange={(e) => updateFilter("highVolumeOnly", e.target.checked)}
                    />
                    High volume (&gt; 1M)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        sector: "",
                        country: "",
                        marketCapMin: "",
                        marketCapMax: "",
                        priceMin: "",
                        priceMax: "",
                        gainersOnly: false,
                        losersOnly: false,
                        highVolumeOnly: false
                      })
                    }
                    className="mt-2 w-fit rounded border px-3 py-2 text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              </div>

              {error && <ErrorMessage message={error} />}

              {loading && !totalLoaded && <LoadingMessage />}

              {/* Client-side pagination controls */}
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <label className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">Items per page</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value) || 25);
                      setDisplayPageIndex(0);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-slate-500"
                  >
                    {[10, 15, 25, 50].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Display paginated items */}
              {(() => {
                const totalFilteredItems = filtered.length;
                const totalDisplayPages = Math.ceil(totalFilteredItems / itemsPerPage);
                const startIdx = displayPageIndex * itemsPerPage;
                const endIdx = startIdx + itemsPerPage;
                const displayItems = filtered.slice(startIdx, endIdx);

                return (
                  <>
                    <StocksTable
                      items={displayItems.map((s) => ({
                        id: `${s.symbol}-${s.exchange ?? ""}`,
                        symbol: s.symbol,
                        name: s.name,
                        price: s.price,
                        change: s.changePercent ?? s.change,
                        rawChange: s.change,
                        exchange: s.exchange,
                        currency: s.currency,
                        open: s.open,
                        high: s.high,
                        low: s.low,
                        previousClose: s.previousClose,
                        volume: s.volume,
                        marketCap: s.marketCap,
                        sector: s.sector,
                        country: s.country,
                        sparkline: s.sparkline || null
                      }))}
                      onToggleWatch={add}
                    />

                    {/* Display pagination info and controls */}
                    {totalDisplayPages > 1 && (
                      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                        <div className="text-sm text-gray-600 dark:text-slate-400">
                          Showing {startIdx + 1} to {Math.min(endIdx, totalFilteredItems)} of {totalFilteredItems.toLocaleString()} items
                          {totalDisplayPages > 1 && ` • Page ${displayPageIndex + 1} of ${totalDisplayPages}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDisplayPageIndex(Math.max(0, displayPageIndex - 1))}
                            disabled={displayPageIndex === 0}
                            className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalDisplayPages }, (_, i) => i).map((idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setDisplayPageIndex(idx)}
                                className={`h-8 w-8 rounded border text-sm transition-colors ${
                                  idx === displayPageIndex
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                }`}
                              >
                                {idx + 1}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setDisplayPageIndex(Math.min(totalDisplayPages - 1, displayPageIndex + 1))}
                            disabled={displayPageIndex === totalDisplayPages - 1}
                            className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
                        </div>
                    </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function MarketHighlight({ title, icon, items = [], color = "blue" }) {
  const Icon = icon;
  const colors = {
    emerald: "emerald",
    rose: "rose",
    blue: "blue",
    amber: "amber"
  };

  const colorClass = colors[color] || colors.blue;

  const bgClass = {
    emerald: "bg-emerald-50 dark:bg-emerald-900/20",
    rose: "bg-rose-50 dark:bg-rose-900/20",
    blue: "bg-blue-50 dark:bg-blue-900/20",
    amber: "bg-amber-50 dark:bg-amber-900/20"
  }[colorClass];

  const textClass = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400"
  }[colorClass];

  const borderClass = {
    emerald: "border-emerald-200 dark:border-emerald-800",
    rose: "border-rose-200 dark:border-rose-800",
    blue: "border-blue-200 dark:border-blue-800",
    amber: "border-amber-200 dark:border-amber-800"
  }[colorClass];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-lg border ${borderClass} ${bgClass} p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
          {title}
        </h3>
        <Icon className={`h-4 w-4 ${textClass}`} />
      </div>
      <ul className="space-y-2">
        {items && items.length ? (
          items.slice(0, 3).map((item, idx) => (
            <motion.li
              key={item.symbol || idx}
              whileHover={{ x: 2 }}
              className="flex items-center justify-between rounded-lg bg-white/50 p-2.5 transition dark:bg-slate-800/30"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {item.symbol}
                </div>
                <div className="truncate text-xs text-slate-600 dark:text-slate-400">
                  {item.name}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className={`text-xs font-bold ${textClass}`}>
                  {formatPercent(item.changePercent || item.change)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  ${Number(item.price || 0).toFixed(2)}
                </div>
              </div>
            </motion.li>
          ))
        ) : (
          <li className="text-xs text-slate-500 dark:text-slate-400">No data available</li>
        )}
      </ul>
    </motion.div>
  );
}

function formatPercent(value) {
  if (value == null) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}
          