import React, { useEffect, useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { motion } from "framer-motion";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import SectorsGrid from "../components/SectorsGrid";
import { LoadingMessage, ErrorMessage } from "../components/SkeletonLoaders";
import { api } from "../utils/api";

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2
});

function formatPercent(value) {
  if (value == null) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numberFormatter.format(numeric);
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(() => {
    const stored = Number(localStorage.getItem("pref-sector-limit"));
    if (Number.isFinite(stored) && stored >= 50 && stored <= 500) return stored;
    return 200;
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSectors() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/market/sectors", {
          params: { limit }
        });
        if (cancelled) return;
        const list = Array.isArray(data?.sectors) ? data.sectors : [];
        setSectors(list);
        setSelected((prev) => {
          if (!list.length) return null;
          if (prev && list.some((sector) => sector.name === prev)) return prev;
          return list[0].name;
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load sectors", err);
          setError(err?.response?.data?.error || "Failed to load sector data");
          setSectors([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSectors();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  useEffect(() => {
    localStorage.setItem("pref-sector-limit", String(limit));
  }, [limit]);

  const activeSector = useMemo(
    () => sectors.find((sector) => sector.name === selected) || null,
    [sectors, selected]
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader
        title="Sector Performance"
        description={`Tracking ${sectors.length} sectors across the market`}
        icon={Layers}
        breadcrumb={<Breadcrumb />}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <label className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Universe size
              </span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 200)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-slate-500"
              >
                {[100, 200, 300, 400, 500].map((opt) => (
                  <option key={opt} value={opt}>
                    Top {opt}
                  </option>
                ))}
              </select>
            </label>
          </motion.div>

          {loading && <LoadingMessage />}
          {!loading && error && <ErrorMessage message={error} />}

          {!loading && !error && sectors.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-900/50"
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No sector data available right now. Try increasing the universe size or refreshing in a moment.
              </p>
            </motion.div>
          )}

          {!loading && !error && sectors.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
            >
              <div>
                <SectorsGrid sectors={sectors} selected={selected} onSelect={setSelected} />
              </div>

              <aside className="space-y-4">
                {activeSector ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {activeSector.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          Weighted daily change
                        </p>
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          Number(activeSector.changePercent) >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatPercent(activeSector.changePercent)}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <DetailStat
                        label="Total Market Cap"
                        value={formatNumber(activeSector.totalMarketCap)}
                      />
                      <DetailStat
                        label="Total Volume"
                        value={formatNumber(activeSector.totalVolume)}
                      />
                      <DetailStat
                        label="Constituents"
                        value={
                          activeSector.symbols?.toLocaleString?.() ?? activeSector.symbols
                        }
                      />
                      <DetailStat
                        label="Advancers"
                        value={
                          activeSector.advancers?.toLocaleString?.() ??
                          activeSector.advancers
                        }
                        valueClass="text-emerald-600 dark:text-emerald-400"
                      />
                      <DetailStat
                        label="Decliners"
                        value={
                          activeSector.decliners?.toLocaleString?.() ??
                          activeSector.decliners
                        }
                        valueClass="text-rose-600 dark:text-rose-400"
                      />
                      <DetailStat
                        label="Unchanged"
                        value={
                          activeSector.unchanged?.toLocaleString?.() ??
                          activeSector.unchanged
                        }
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-900/50"
                  >
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Select a sector to see details
                    </p>
                  </motion.div>
                )}

                {activeSector && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                  >
                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        Top Constituents
                      </h3>
                      <ul className="mt-4 space-y-3">
                        {activeSector.topConstituents &&
                        activeSector.topConstituents.length ? (
                          activeSector.topConstituents.map((stock) => (
                            <motion.li
                              key={stock.symbol}
                              whileHover={{ x: 4 }}
                              className="flex items-center justify-between rounded-lg bg-slate-50 p-3 transition dark:bg-slate-800/50"
                            >
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {stock.symbol}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                  {stock.name}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {formatNumber(stock.marketCap)}
                                </div>
                                <div
                                  className={`text-xs font-semibold ${
                                    Number(stock.changePercent) >= 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {formatPercent(stock.changePercent)}
                                </div>
                              </div>
                            </motion.li>
                          ))
                        ) : (
                          <li className="text-xs text-slate-500 dark:text-slate-400">
                            No data available
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                        Top Movers
                      </h3>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <MoverList
                          title="Gainers"
                          items={activeSector.topMovers?.gainers}
                          positive
                        />
                        <MoverList
                          title="Losers"
                          items={activeSector.topMovers?.losers}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </aside>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailStat({ label, value, valueClass = "text-slate-900 dark:text-white" }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-sm font-bold ${valueClass}`}>{value ?? "—"}</div>
    </div>
  );
}

function MoverList({ title, items = [], positive = false }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items && items.length ? (
          items.map((item) => (
            <motion.li
              key={item.symbol}
              whileHover={{ x: 2 }}
              className="flex items-center justify-between rounded-lg bg-slate-50 p-2 transition dark:bg-slate-800/50"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.symbol}
              </span>
              <span
                className={`text-xs font-bold ${
                  Number(item.changePercent) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatPercent(item.changePercent)}
              </span>
            </motion.li>
          ))
        ) : (
          <li className="text-xs text-slate-500 dark:text-slate-400">No data</li>
        )}
      </ul>
    </div>
  );
}
