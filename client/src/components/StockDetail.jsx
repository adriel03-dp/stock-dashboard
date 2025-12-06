import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { api } from "../utils/api";

const RANGE_ORDER = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "MAX"];

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2
});

function formatCurrency(value, currency = "USD") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: numeric >= 100 ? 2 : 4
    }).format(numeric);
  } catch (err) {
    return priceFormatter.format(numeric);
  }
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numberFormatter.format(numeric);
}

function formatPercent(value) {
  if (value == null) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function formatEventDate(value, timezone) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const options = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  };
  if (timezone) options.timeZoneName = "short";
  return date.toLocaleString([], options);
}

function formatEventDateRange(start, end, timezone) {
  const startLabel = formatEventDate(start, timezone);
  const endLabel = formatEventDate(end, timezone);
  if (startLabel && endLabel) {
    if (startLabel === endLabel) return startLabel;
    return `${startLabel} → ${endLabel}`;
  }
  return startLabel || endLabel || null;
}

function formatTimestampLabel(range, timestamp) {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return "";
  if (range === "1D" || range === "5D") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "MAX") {
    return date.getFullYear();
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const [{ value }] = payload;
  return (
    <div className="rounded border border-slate-200 bg-white px-3 py-2 shadow">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-800">{formatCurrency(value)}</div>
    </div>
  );
}

export default function StockDetail({ data }) {
  const summary = data?.summary || {
    symbol: data?.symbol,
    name: data?.name,
    price: data?.price,
    change: data?.change,
    changePercent: data?.changePercent,
    currency: data?.currency || "USD"
  };
  const metrics = data?.metrics || {};
  const profile = data?.profile || {};
  const indicators = data?.indicators || {};
  const dividends = Array.isArray(data?.dividends) ? data.dividends : [];
  const related = Array.isArray(data?.related) ? data.related : [];
  const events = Array.isArray(data?.events) ? data.events : [];

  const availableRanges = useMemo(() => {
    if (!data?.history || typeof data.history !== "object") return [];
    return RANGE_ORDER.filter((key) => Array.isArray(data.history[key]) && data.history[key].length);
  }, [data?.history]);

  const defaultRange = availableRanges[0] || RANGE_ORDER[0];
  const [range, setRange] = useState(defaultRange);

  useEffect(() => {
    setRange((prev) => (availableRanges.includes(prev) ? prev : defaultRange));
  }, [availableRanges, defaultRange]);

  const chartData = useMemo(() => {
    const selected = Array.isArray(data?.history?.[range]) ? data.history[range] : [];
    return selected
      .map((point) => {
        const timestamp = point.timestamp ?? point.t ?? point.time ?? null;
        const close = Number(point.close ?? point.c);
        if (timestamp == null || !Number.isFinite(close)) return null;
        return {
          timestamp,
          timeLabel: formatTimestampLabel(range, timestamp),
          close
        };
      })
      .filter(Boolean);
  }, [data?.history, range]);

  const [adding, setAdding] = useState(false);

  const handleAddToWatchlist = async () => {
    if (!summary?.symbol) return;
    setAdding(true);
    try {
      await api.post("/watchlist", {
        symbol: summary.symbol,
        name: summary.name,
        lastPrice: summary.price,
        type: "stock"
      });
      alert(`${summary.symbol} added to watchlist`);
    } catch (err) {
      const message = err?.response?.status === 409
        ? "Already in watchlist"
        : err?.response?.data?.error || "Failed to add to watchlist";
      alert(message);
    } finally {
      setAdding(false);
    }
  };

  const changeIsPositive = summary?.changePercent != null ? Number(summary.changePercent) >= 0 : Number(summary?.change) >= 0;

  const macd = indicators?.macd || {};

  return (
    <div className="space-y-6">
      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">{summary.exchange || "Stock"}</div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">{summary.symbol}</h1>
              {summary.name && <span className="text-sm text-gray-500">{summary.name}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-semibold text-gray-900">{formatCurrency(summary.price, summary.currency)}</div>
            <div className={`text-sm font-medium ${changeIsPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {formatPercent(summary.changePercent ?? summary.change)}
            </div>
            {summary.lastUpdated && (
              <div className="text-xs text-gray-400">Last updated {new Date(summary.lastUpdated).toLocaleString()}</div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {availableRanges.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                range === key ? "bg-blue-600 text-white" : "bg-slate-100 text-gray-600 hover:bg-slate-200"
              }`}
            >
              {key}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddToWatchlist}
              disabled={adding}
              className="rounded-md border border-blue-600 px-3 py-1 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add to Watchlist"}
            </button>
          </div>
        </div>

        <div className="mt-4 h-80">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="timeLabel" tick={{ fontSize: 12 }} stroke="#94a3b8" interval={Math.ceil(chartData.length / 8)} />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => formatCurrency(value, summary.currency)} tick={{ fontSize: 12 }} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="close" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">No price history available for this range.</div>
          )}
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Key Metrics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Open" value={formatCurrency(metrics.open, summary.currency)} />
          <MetricCard label="Previous Close" value={formatCurrency(metrics.previousClose, summary.currency)} />
          <MetricCard label="Day High" value={formatCurrency(metrics.high, summary.currency)} />
          <MetricCard label="Day Low" value={formatCurrency(metrics.low, summary.currency)} />
          <MetricCard label="52 Week High" value={formatCurrency(metrics.week52High, summary.currency)} />
          <MetricCard label="52 Week Low" value={formatCurrency(metrics.week52Low, summary.currency)} />
          <MetricCard label="Volume" value={formatNumber(metrics.volume)} />
          <MetricCard label="Average Volume" value={formatNumber(metrics.avgVolume)} />
          <MetricCard label="Market Cap" value={formatNumber(metrics.marketCap)} />
          <MetricCard label="P/E Ratio" value={metrics.peRatio != null ? Number(metrics.peRatio).toFixed(2) : "—"} />
          <MetricCard label="EPS" value={metrics.eps != null ? Number(metrics.eps).toFixed(2) : "—"} />
          <MetricCard label="Dividend Yield" value={formatPercent(metrics.dividendYield)} />
        </div>
      </section>

      {(indicators.ema50 || indicators.ema200 || indicators.rsi || macd) && (
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Technical Indicators</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {indicators.ema50 && <MetricCard label="EMA 50" value={formatCurrency(indicators.ema50, summary.currency)} />}
            {indicators.ema200 && <MetricCard label="EMA 200" value={formatCurrency(indicators.ema200, summary.currency)} />}
            {indicators.rsi && <MetricCard label="RSI" value={Number(indicators.rsi).toFixed(2)} />}
            {macd && (macd.macd != null || macd.signal != null || macd.histogram != null) && (
              <div className="rounded border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">MACD</div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  {macd.macd != null && <div>MACD: {Number(macd.macd).toFixed(2)}</div>}
                  {macd.signal != null && <div>Signal: {Number(macd.signal).toFixed(2)}</div>}
                  {macd.histogram != null && <div>Histogram: {Number(macd.histogram).toFixed(2)}</div>}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {profile && (profile.description || profile.sector || profile.industry) && (
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Company Profile</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {profile.description && <p className="text-sm leading-relaxed text-gray-700">{profile.description}</p>}
            <div className="space-y-2 text-sm text-gray-600">
              {profile.sector && (
                <div>
                  <span className="font-medium text-gray-700">Sector:</span> {profile.sector}
                </div>
              )}
              {profile.industry && (
                <div>
                  <span className="font-medium text-gray-700">Industry:</span> {profile.industry}
                </div>
              )}
              {profile.ceo && (
                <div>
                  <span className="font-medium text-gray-700">CEO:</span> {profile.ceo}
                </div>
              )}
              {profile.employees && (
                <div>
                  <span className="font-medium text-gray-700">Employees:</span> {formatNumber(profile.employees)}
                </div>
              )}
              {profile.address && (
                <div>
                  <span className="font-medium text-gray-700">Address:</span> {profile.address}
                  {(() => {
                    const extra = [profile.city, profile.state, profile.country].filter(Boolean);
                    return extra.length ? `, ${extra.join(", ")}` : "";
                  })()}
                </div>
              )}
              {profile.website && (
                <div>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Company website
                  </a>
                </div>
              )}
              {profile.founded && (
                <div>
                  <span className="font-medium text-gray-700">Founded:</span> {profile.founded}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

        {!!events.length && (
          <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">Corporate Events</h2>
            <div className="mt-3 space-y-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

      {!!dividends.length && (
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Dividend History</h2>
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Record Date</th>
                  <th className="px-3 py-2 text-left">Payment Date</th>
                  <th className="px-3 py-2 text-left">Cash Amount</th>
                  <th className="px-3 py-2 text-left">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((div) => (
                  <tr key={div.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-gray-700">{div.recordDate || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{div.payDate || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{formatCurrency(div.cashAmount, div.currency)}</td>
                    <td className="px-3 py-2 text-gray-700 capitalize">{div.frequency || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!!related.length && (
        <section className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Related Symbols</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((rel) => (
              <Link
                key={rel.symbol}
                to={`/stock/${encodeURIComponent(rel.symbol)}`}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm text-blue-600 transition hover:bg-blue-50"
              >
                {rel.symbol}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-800">{value}</div>
    </div>
  );
}

function EventCard({ event }) {
  const {
    type,
    title,
    description,
    startDate,
    endDate,
    timezone,
    status,
    url,
    categories = [],
    tickers = []
  } = event;

  const dateLabel = formatEventDateRange(startDate, endDate, timezone);
  const hasMeta = Boolean(categories.length || tickers.length || url);

  return (
    <div className="rounded border border-slate-200 p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          {type && <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{type}</span>}
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {dateLabel && <div className="text-xs text-gray-500">{dateLabel}</div>}
        </div>
        {status && (
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {status}
          </span>
        )}
      </div>

      {description && <p className="mt-2 text-sm text-gray-700">{description}</p>}

      {hasMeta && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
          {categories.map((cat) => {
            const label = typeof cat === "string"
              ? cat
              : (cat && typeof cat === "object" && (cat.name || cat.label || cat.id)) || String(cat);
            return (
              <span key={`cat-${label}`} className="rounded-full bg-slate-100 px-2 py-0.5">
                {label}
              </span>
            );
          })}
          {tickers.map((ticker) => {
            const label = typeof ticker === "string"
              ? ticker
              : (ticker && typeof ticker === "object" && (ticker.symbol || ticker.ticker || ticker.name)) || String(ticker);
            return (
              <span key={`ticker-${label}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                {label}
              </span>
            );
          })}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              View details
            </a>
          )}
        </div>
      )}
    </div>
  );
}
