import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import MarketMetricCard from "../components/MarketMetricCard";
import Heatmap from "../components/Heatmap";
import TrendingTabs from "../components/TrendingTabs";
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
      alert(`${symbol} added to watchlist`);
    } catch (err) {
      const message = err?.response?.status === 409
        ? "Already in watchlist"
        : err?.response?.data?.error || "Failed to add to watchlist";
      alert(message);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto grid grid-cols-12 gap-6">
        <div className="col-span-9 space-y-6">
          <section className="bg-white p-4 rounded shadow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Global Market Overview</h3>
                {marketStatusLabel && (
                  <p className={`text-sm ${marketStatusLabel.isOpen ? "text-emerald-600" : "text-amber-600"}`}>
                    Market status: {marketStatusLabel.label}
                  </p>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {overviewLoading && "Loading…"}
                {!overviewLoading && overviewError && <span className="text-rose-600">{overviewError}</span>}
              </div>
            </div>

            {breadth && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div className="rounded bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Advancing</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {breadth.advancing.toLocaleString()} <span className="text-sm text-gray-500">({breadth.advancingPct.toFixed(1)}%)</span>
                  </p>
                </div>
                <div className="rounded bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Declining</p>
                  <p className="text-lg font-semibold text-rose-600">
                    {breadth.declining.toLocaleString()} <span className="text-sm text-gray-500">({breadth.decliningPct.toFixed(1)}%)</span>
                  </p>
                </div>
                <div className="rounded bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Unchanged</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {breadth.unchanged.toLocaleString()} <span className="text-sm text-gray-500">({breadth.unchangedPct.toFixed(1)}%)</span>
                  </p>
                </div>
                <div className="rounded bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Stocks</p>
                  <p className="text-lg font-semibold text-gray-700">{breadth.total.toLocaleString()}</p>
                </div>
              </div>
            )}

            {!!highlights.length && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {highlights.map(({ title, items }) => (
                  <div key={title} className="rounded border border-slate-100 p-3">
                    <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
                    <ul className="mt-2 space-y-2 text-sm">
                      {items.length ? (
                        items.map((item) => {
                          const change = item?.changePercent ?? item?.change;
                          let positive = null;
                          let changeLabel = "—";

                          if (typeof change === "number") {
                            positive = change >= 0;
                            changeLabel = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
                          } else if (typeof change === "string") {
                            const trimmed = change.trim();
                            positive = trimmed.startsWith("+");
                            changeLabel = trimmed;
                          }

                          return (
                            <li key={item.symbol} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{item.symbol}</p>
                                <p className="text-xs text-gray-500">{item.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  {item.price != null && Number.isFinite(Number(item.price))
                                    ? `$${Number(item.price).toFixed(2)}`
                                    : "—"}
                                </p>
                                <p className={`text-xs ${positive == null ? "text-gray-500" : positive ? "text-emerald-600" : "text-rose-600"}`}>
                                  {changeLabel}
                                </p>
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="text-xs text-gray-500">No data available</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-3 gap-4">
            <MarketMetricCard title="S&P 500" value="4,500" change={0.24} />
            <MarketMetricCard title="NIFTY 50" value="19,200" change={-0.34} />
            <MarketMetricCard title="DOW JONES" value="34,000" change={0.12} />
          </div>

          <section className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-3">Market Heatmap</h3>
            {heatmapSectors.length ? (
              <Heatmap sectors={heatmapSectors} />
            ) : (
              <p className="text-sm text-gray-500">Heatmap data unavailable</p>
            )}
          </section>

          <section className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-3">Trending</h3>
            <TrendingTabs
              list={trending}
              onAdd={handleAddCoin}
              pendingId={pendingId}
            />
          </section>
        </div>

        <aside className="col-span-3 space-y-4">
          <div className="bg-white p-4 rounded shadow">Portfolio Snapshot (placeholder)</div>
          <div className="bg-white p-4 rounded shadow">News & Alerts</div>
        </aside>
      </div>
    </div>
  );
}
