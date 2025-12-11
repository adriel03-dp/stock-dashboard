import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import SectorsGrid from "../components/SectorsGrid";
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
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Sector Performance</h1>
            <p className="text-sm text-gray-500">
              Tracking {sectors.length} sectors across the Massive market universe
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs uppercase tracking-wide text-gray-500">Universe size</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 200)}
              className="rounded border px-2 py-1 shadow-sm"
            >
              {[100, 200, 300, 400, 500].map((opt) => (
                <option key={opt} value={opt}>
                  Top {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && (
          <div className="rounded border border-slate-200 bg-white p-4 text-sm text-gray-500 shadow">
            Loading sectors…
          </div>
        )}

        {!loading && error && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow">
            {error}
          </div>
        )}

        {!loading && !error && sectors.length === 0 && (
          <div className="rounded border border-slate-200 bg-white p-4 text-sm text-gray-500 shadow">
            No sector data available right now. Try increasing the universe size or refreshing in a moment.
          </div>
        )}

        {!loading && !error && sectors.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <SectorsGrid sectors={sectors} selected={selected} onSelect={setSelected} />

            <aside className="space-y-4">
              {activeSector ? (
                <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{activeSector.name}</h2>
                      <div className="text-sm text-gray-500">Weighted daily change</div>
                    </div>
                    <div className={`text-xl font-semibold ${Number(activeSector.changePercent) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatPercent(activeSector.changePercent)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailStat label="Total Market Cap" value={formatNumber(activeSector.totalMarketCap)} />
                    <DetailStat label="Total Volume" value={formatNumber(activeSector.totalVolume)} />
                    <DetailStat label="Constituents" value={activeSector.symbols?.toLocaleString?.() ?? activeSector.symbols} />
                    <DetailStat label="Advancers" value={activeSector.advancers?.toLocaleString?.() ?? activeSector.advancers} valueClass="text-emerald-600" />
                    <DetailStat label="Decliners" value={activeSector.decliners?.toLocaleString?.() ?? activeSector.decliners} valueClass="text-rose-600" />
                    <DetailStat label="Unchanged" value={activeSector.unchanged?.toLocaleString?.() ?? activeSector.unchanged} />
                  </div>
                </div>
              ) : (
                <div className="rounded border border-slate-200 bg-white p-4 text-sm text-gray-500 shadow">
                  Select a sector to see details
                </div>
              )}

              {activeSector && (
                <div className="space-y-4">
                  <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Top Constituents</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {activeSector.topConstituents && activeSector.topConstituents.length ? (
                        activeSector.topConstituents.map((stock) => (
                          <li key={stock.symbol} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">{stock.symbol}</div>
                              <div className="text-xs text-gray-500">{stock.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-800">{formatNumber(stock.marketCap)} cap</div>
                              <div className={`text-xs ${Number(stock.changePercent) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {formatPercent(stock.changePercent)}
                              </div>
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-gray-500">No data</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Top Movers</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <MoverList title="Gainers" items={activeSector.topMovers?.gainers} positive />
                      <MoverList title="Losers" items={activeSector.topMovers?.losers} />
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailStat({ label, value, valueClass = "text-gray-800" }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-sm font-medium ${valueClass}`}>{value ?? "—"}</div>
    </div>
  );
}

function MoverList({ title, items = [], positive = false }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <ul className="mt-2 space-y-2">
        {items && items.length ? (
          items.map((item) => (
            <li key={item.symbol} className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{item.symbol}</span>
              <span className={`text-xs font-semibold ${
                Number(item.changePercent) >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}>
                {formatPercent(item.changePercent)}
              </span>
            </li>
          ))
        ) : (
          <li className="text-xs text-gray-500">No data</li>
        )}
      </ul>
    </div>
  );
}
