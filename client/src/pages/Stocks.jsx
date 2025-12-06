import React, { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import StocksTable from "../components/StocksTable";
import { api } from "../utils/api";

function getStoredLimit() {
    if (typeof window === "undefined") return 100;
    const stored = Number(window.localStorage.getItem("pref-stock-limit"));
    if (Number.isFinite(stored) && stored >= 50 && stored <= 500) return stored;
    return 100;
}

export default function Stocks() {
    const [pages, setPages] = useState([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingNext, setLoadingNext] = useState(false);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(() => getStoredLimit());
    const [sortKey, setSortKey] = useState("market-cap-desc");
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
            return;
        }
        const lastPage = pages[pages.length - 1];
        if (!lastPage?.nextCursor) return;
        fetchPage({ cursor: lastPage.nextCursor });
    };

    const goToPrev = () => {
        if (pageIndex === 0 || loadingNext) return;
        setPageIndex(pageIndex - 1);
    };

    const updateFilter = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
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
            alert(`${it.symbol.toUpperCase()} added to watchlist`);
        } catch (err) {
            const message = err?.response?.status === 409
                ? "Already in watchlist"
                : err?.response?.data?.error || "Failed to add to watchlist";
            alert(message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar onSearch={setQuery} />
            <div className="p-6 max-w-7xl mx-auto space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Stock Market Directory</h1>
                        <p className="text-sm text-gray-500">
                            Showing {filtered.length.toLocaleString()} of {(currentPage.items?.length || 0).toLocaleString()} symbols · {totalLoaded.toLocaleString()} loaded overall
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <label className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wide text-gray-500">Rows / fetch</span>
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value) || INITIAL_LIMIT)}
                                className="rounded border px-2 py-1"
                            >
                                {[50, 100, 200, 500].map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wide text-gray-500">Sort by</span>
                            <select
                                value={sortKey}
                                onChange={(e) => setSortKey(e.target.value)}
                                className="rounded border px-2 py-1"
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
                </div>

                <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Filters</h2>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Sector</label>
                            <input
                                value={filters.sector}
                                onChange={(e) => updateFilter("sector", e.target.value)}
                                placeholder="e.g. Technology"
                                className="rounded border px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Country</label>
                            <input
                                value={filters.country}
                                onChange={(e) => updateFilter("country", e.target.value)}
                                placeholder="e.g. US"
                                className="rounded border px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Market Cap (min)</label>
                            <input
                                value={filters.marketCapMin}
                                onChange={(e) => updateFilter("marketCapMin", e.target.value)}
                                placeholder="e.g. 1000000000"
                                className="rounded border px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Market Cap (max)</label>
                            <input
                                value={filters.marketCapMax}
                                onChange={(e) => updateFilter("marketCapMax", e.target.value)}
                                placeholder="e.g. 50000000000"
                                className="rounded border px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Price (min)</label>
                            <input
                                value={filters.priceMin}
                                onChange={(e) => updateFilter("priceMin", e.target.value)}
                                placeholder="e.g. 10"
                                className="rounded border px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Price (max)</label>
                            <input
                                value={filters.priceMax}
                                onChange={(e) => updateFilter("priceMax", e.target.value)}
                                placeholder="e.g. 300"
                                className="rounded border px-3 py-2 text-sm"
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

                {error && (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {loading && !totalLoaded && (
                    <div className="text-sm text-gray-500">Loading {limit.toLocaleString()} symbols…</div>
                )}

                <StocksTable
                    items={filtered.map((s) => ({
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

                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                    <div className="text-sm text-gray-600">
                        Page {pages.length ? pageIndex + 1 : 0} of {pages.length || 0}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={goToPrev}
                            disabled={pageIndex === 0 || loadingNext}
                            className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <div className="flex items-center gap-1">
                            {pages.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => goToPage(idx)}
                                    className={`h-8 w-8 rounded border text-sm ${
                                        idx === pageIndex ? "bg-blue-600 text-white border-blue-600" : "bg-white"
                                    }`}
                                    disabled={loadingNext && idx === pages.length - 1 && hasNextPage}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                            {hasNextPage && (
                                <button
                                    type="button"
                                    onClick={goToNext}
                                    disabled={loadingNext}
                                    className="h-8 rounded border px-3 text-sm disabled:opacity-50"
                                >
                                    {loadingNext ? "Loading…" : "Next"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
