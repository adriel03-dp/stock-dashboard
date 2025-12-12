import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import MarketMetricCard from "../components/MarketMetricCard";
import Heatmap from "../components/Heatmap";
import TrendingTabs from "../components/TrendingTabs";
import { LoadingMessage, ErrorMessage, SkeletonCard } from "../components/SkeletonLoaders";
import { useToast } from "../components/Toast";
import { api } from "../utils/api";
import usePollingFetch from "../hooks/usePollingFetch";

const DEFAULT_REFRESH_SECONDS = 30;
const MIN_REFRESH_SECONDS = 5;
const MAX_REFRESH_SECONDS = 120;

function sanitizeRefreshSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_REFRESH_SECONDS;
  return Math.min(Math.max(numeric, MIN_REFRESH_SECONDS), MAX_REFRESH_SECONDS);
}

function getStoredAutoRefresh() {
  if (typeof window === "undefined") return DEFAULT_REFRESH_SECONDS;
  const stored = window.localStorage.getItem("pref-auto-refresh");
  return sanitizeRefreshSeconds(stored);
}

export default function Dashboard() {
  const toast = useToast();
  const [refreshSeconds, setRefreshSeconds] = useState(() => getStoredAutoRefresh());
  const refreshIntervalMs = Math.max(refreshSeconds, MIN_REFRESH_SECONDS) * 1000;
  const overviewPollMs = Math.max(refreshIntervalMs, 30000);
  const sectorPollMs = Math.max(refreshIntervalMs, 30000);

  const { data: coinsData } = usePollingFetch(
    () => api.get("/live/crypto/top/12").then((r) => r.data),
    [],
    refreshIntervalMs
  );
  const { data: sectorData } = usePollingFetch(
    () => api.get("/market/sectors", { params: { limit: 200 } }).then((r) => (Array.isArray(r.data?.sectors) ? r.data.sectors : [])),
    [],
    sectorPollMs
  );
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const hasLoadedOverview = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePreferencesUpdate = (event) => {
      if (!event?.detail || event.detail.autoRefresh == null) return;
      const parsed = Number(event.detail.autoRefresh);
      if (!Number.isFinite(parsed)) return;
      const next = sanitizeRefreshSeconds(parsed);
      setRefreshSeconds((current) => (current === next ? current : next));
    };
    window.addEventListener("preferences:update", handlePreferencesUpdate);
    return () => {
      window.removeEventListener("preferences:update", handlePreferencesUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleStorage = (event) => {
      if (event.key !== "pref-auto-refresh" || event.newValue == null) return;
      const parsed = Number(event.newValue);
      if (!Number.isFinite(parsed)) return;
      const next = sanitizeRefreshSeconds(parsed);
      setRefreshSeconds((current) => (current === next ? current : next));
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const coins = coinsData || [];
  const trending = coins.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    price: c.current_price,
    change: c.price_change_percentage_24h
  }));

  const heatmapSectors = useMemo(() => {
    if (!Array.isArray(sectorData)) return [];
    return sectorData
      .map((sector) => {
        const change = Number(sector?.changePercent);
        if (!Number.isFinite(change)) return null;
        return {
          name: sector?.name || "Unknown",
          change
        };
      })
      .filter(Boolean)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 8);
  }, [sectorData]);

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    async function loadOverview() {
      if (!hasLoadedOverview.current) {
        setOverviewLoading(true);
      }
      setOverviewError(null);
      try {
        const { data: response } = await api.get("/market/overview", { params: { limit: 5 } });
        if (!cancelled) {
          setOverview(response);
          hasLoadedOverview.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load market overview", err);
          setOverviewError("Unable to load market overview");
        }
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    }

    loadOverview();
    intervalId = setInterval(loadOverview, overviewPollMs);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [overviewPollMs]);

  const handleAddCoin = async (item) => {
    if (!item?.symbol) return;
    const symbol = item.symbol.toUpperCase();
    const payload = {
      symbol,
      name: item.name,
      lastPrice: Number.isFinite(Number(item.price)) ? Number(item.price) : undefined,
      type: "crypto"
    };

    setPendingId(item.id || symbol);
    try {
      await api.post("/watchlist", payload);
      toast.success(`${symbol} added to StockDash Watchlist`);
    } catch (err) {
      if (err?.response?.status === 409) {
        toast.warning(`${symbol} is already in your StockDash Watchlist`);
      } else {
        toast.error(err?.response?.data?.error || "Failed to add to watchlist");
      }
    } finally {
      setPendingId(null);
    }
  };

  const highlights = useMemo(() => {
    if (!overview?.highlights) return [];
    return [
      { title: "Top Gainers", items: overview.highlights.topGainers || [] },
      { title: "Top Losers", items: overview.highlights.topLosers || [] },
      { title: "Most Active", items: overview.highlights.mostActive || [] },
      { title: "Top Market Cap", items: overview.highlights.topMarketCap || [] }
    ];
  }, [overview]);

  const breadth = overview?.breadth;

  const marketStatusLabel = useMemo(() => {
    if (!overview?.marketStatus) return null;
    const status = overview.marketStatus.market || overview.marketStatus.status || overview.marketStatus.phase;
    if (!status) return null;
    const normalized = String(status).toLowerCase();
    const isOpen = normalized.includes("open");
    return {
      label: status,
      isOpen
    };
  }, [overview]);

  const metricCards = useMemo(() => {
    const indices = Array.isArray(overview?.indices) ? overview.indices : [];
    if (indices.length) {
      return indices.slice(0, 4).map((item, index) => ({
        title: item.symbol || item.name || `Index ${index + 1}`,
        value: Number(item.price ?? item.last ?? item.value ?? item.indexValue ?? 0),
        change: Number(
          item.changePercent ?? item.percentChange ?? item.changePct ?? item.change ?? item.delta ?? 0
        ),
        subtitle: item.name && item.symbol ? item.name : undefined,
        tone: index === 0 ? "highlight" : "neutral"
      }));
    }

    return [
      { title: "S&P 500", value: 4500, change: 0.24, subtitle: "Prev close", tone: "highlight" },
      { title: "NIFTY 50", value: 19200, change: -0.34, subtitle: "NSE benchmark" },
      { title: "Dow Jones", value: 34000, change: 0.12, subtitle: "US blue chips" },
      { title: "NASDAQ", value: 13750, change: 0.45, subtitle: "Growth leaders" }
    ];
  }, [overview]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.1),transparent_55%)] dark:bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.05),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.08),transparent_45%)] dark:bg-[radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.03),transparent_45%)]" />
      <main className="mx-auto w-full max-w-7xl">
        <PageHeader
          title="Market Dashboard"
          description="Real-time market data, trends, and analytics"
          icon={TrendingUp}
          breadcrumb={<Breadcrumb />}
          backgroundImages={[
            "/stock-market.jpg",
            "/financial-data.jpg",
            "/screen-showing-data.jpg",
            "/cryptocurrwncy-concept.jpg"
          ]}
          cycleInterval={3000}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-8">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">Global Market Overview</h1>
                  {marketStatusLabel && (
                    <p
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        marketStatusLabel.isOpen
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      Live status · {marketStatusLabel.label}
                    </p>
                  )}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {overviewLoading && <span>Refreshing data…</span>}
                  {!overviewLoading && overviewError && <span className="text-rose-500">{ overviewError}</span>}
                  {!overviewLoading && !overviewError && (
                    <span>Auto refresh every {refreshSeconds}s</span>
                  )}
                </div>
              </div>

              {breadth && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[{
                    label: "Advancing",
                    value: breadth.advancing,
                    pct: breadth.advancingPct,
                    tone: "positive"
                  }, {
                    label: "Declining",
                    value: breadth.declining,
                    pct: breadth.decliningPct,
                    tone: "negative"
                  }, {
                    label: "Unchanged",
                    value: breadth.unchanged,
                    pct: breadth.unchangedPct
                  }, {
                    label: "Total Stocks",
                    value: breadth.total
                  }].map(({ label, value, pct, tone }) => {
                    const numericValue = Number(value);
                    const formattedValue = Number.isFinite(numericValue)
                      ? numericValue.toLocaleString()
                      : "—";
                    const numericPct = Number(pct);
                    const formattedPct = Number.isFinite(numericPct)
                      ? numericPct.toFixed(1)
                      : null;

                    return (
                    <div
                      key={label}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                      <p
                        className={`mt-2 text-xl font-semibold ${
                          tone === "positive"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : tone === "negative"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {formattedValue} {formattedPct != null && (
                          <span className="ml-1 text-sm font-medium text-slate-400 dark:text-slate-500">({formattedPct}%)</span>
                        )}
                      </p>
                    </div>
                    );
                  })}
                </div>
              )}

              {!!highlights.length && (
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {highlights.map(({ title, items }) => (
                    <motion.div
                      key={title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
                      <ul className="mt-3 space-y-3 text-sm">
                        {items.length ? (
                          items.map((item) => {
                            const change = item?.changePercent ?? item?.change;
                            let positive = null;
                            let changeLabel = "—";

                            if (typeof change === "number" && Number.isFinite(change)) {
                              positive = change >= 0;
                              changeLabel = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
                            } else if (typeof change === "string" && change.trim().length) {
                              const trimmed = change.trim();
                              positive = trimmed.startsWith("+");
                              changeLabel = trimmed;
                            }

                            return (
                              <li key={item.symbol} className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.symbol}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {item.price != null && Number.isFinite(Number(item.price))
                                      ? `$${Number(item.price).toFixed(2)}`
                                      : "—"}
                                  </p>
                                  <p className={`text-xs font-semibold ${
                                    positive == null
                                      ? "text-slate-400 dark:text-slate-500"
                                      : positive
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-500 dark:text-rose-400"
                                  }`}
                                  >
                                    {changeLabel}
                                  </p>
                                </div>
                              </li>
                            );
                          })
                        ) : (
                          <li className="text-xs text-slate-400 dark:text-slate-500">No data available</li>
                        )}
                      </ul>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.45, ease: "easeOut" }}
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {metricCards.map((card) => (
                  <MarketMetricCard key={card.title} {...card} />
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Market Heatmap</h3>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Top sectors by movement</span>
              </div>
              <div className="mt-5">
                {heatmapSectors.length ? (
                  <Heatmap sectors={heatmapSectors} />
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Heatmap data unavailable right now.
                  </p>
                )}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/30 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Trending Assets</h3>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Tap to add to watchlist</span>
              </div>
              <div className="mt-5">
                <TrendingTabs list={trending} onAdd={handleAddCoin} pendingId={pendingId} />
              </div>
            </motion.section>
          </div>

          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-lg shadow-slate-200/30 dark:border-slate-700 dark:from-blue-900/20 dark:to-slate-900 dark:shadow-none">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Portfolio Snapshot</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Track performance, diversification, and live P/L once your holdings are imported.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("watchlist:navigate", { detail: { tab: "portfolio" } }));
                  }
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                Open Portfolio
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/30 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">News & Alerts</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Curated headlines from Massive with live sentiment scoring arrive here once you subscribe to alerts.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs dark:border-slate-600 dark:bg-slate-800">
                  Configure alert rules in Settings → Notifications.
                </li>
                <li className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs dark:border-slate-600 dark:bg-slate-800">
                  Real-time Massive feeds stream directly into the Watchlist view.
                </li>
              </ul>
            </div>
          </motion.aside>
        </div>
      </main>
    </div>
  );
}
