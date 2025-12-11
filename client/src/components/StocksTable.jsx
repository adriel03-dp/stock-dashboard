import { Link } from "react-router-dom";

const currencyFormatters = new Map();
const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

function formatPrice(value, currency = "USD") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";

  const key = (currency || "USD").toUpperCase();
  if (!currencyFormatters.has(key)) {
    try {
      currencyFormatters.set(
        key,
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: key,
          maximumFractionDigits: 2
        })
      );
    } catch (err) {
      currencyFormatters.set(
        key,
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2
        })
      );
    }
  }

  return currencyFormatters.get(key).format(numeric);
}

function formatPercent(value) {
  if (value == null) return { label: "—", isPositive: null };

  if (typeof value === "string" && value.trim().length === 0) {
    return { label: "—", isPositive: null };
  }

  const parsed = typeof value === "number"
    ? value
    : Number(String(value).replace(/%/g, ""));

  if (!Number.isFinite(parsed)) {
    const display = typeof value === "string" ? value : "—";
    return { label: display, isPositive: null };
  }

  const label = `${parsed >= 0 ? "+" : ""}${parsed.toFixed(2)}%`;
  return { label, isPositive: parsed >= 0 };
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return compactFormatter.format(numeric);
}

function formatAbsoluteChange(value, currency) {
  if (value == null) return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  const label = formatPrice(Math.abs(numeric), currency);
  return `${numeric >= 0 ? "+" : "-"}${label}`;
}

function Sparkline({ data = [], positive }) {
  if (!Array.isArray(data) || data.length < 2) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const values = data
    .map((value) => Number(value))
    .filter((num) => Number.isFinite(num));

  if (values.length < 2) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 40 - ((value - min) / range) * 40;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const stroke = positive == null ? "#6b7280" : positive ? "#10b981" : "#ef4444";

  return (
    <svg viewBox="0 0 100 40" className="h-10 w-24">
      <path d={points.join(" ")} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function StocksTable({ items = [], onToggleWatch }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th className="p-3 text-left">Symbol</th>
            <th className="p-3 text-left">Company</th>
            <th className="p-3 text-right">Price</th>
            <th className="p-3 text-right">% Change</th>
            <th className="p-3 text-right">Open</th>
            <th className="p-3 text-right">High / Low</th>
            <th className="p-3 text-right">Prev Close</th>
            <th className="p-3 text-right">Volume</th>
            <th className="p-3 text-right">Market Cap</th>
            <th className="p-3 text-left">Sector</th>
            <th className="p-3 text-left">Country</th>
            <th className="p-3 text-center">1D</th>
            <th className="p-3 text-center">Watch</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/80 dark:divide-slate-700/80">
           {items.map((it) => {
             const percentChange = formatPercent(it.change);
             const changeClass =
               percentChange.isPositive == null
                 ? "text-slate-500 dark:text-slate-400"
                 : percentChange.isPositive
                 ? "text-emerald-600 dark:text-emerald-400"
                 : "text-rose-600 dark:text-rose-400";

             const sparkPositive = percentChange.isPositive;

             return (
              <tr key={it.id} className="bg-white text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800">
                <td className="p-3 font-semibold text-slate-900 dark:text-white">
                  <Link to={`/stock/${encodeURIComponent(it.symbol)}`} className="rounded px-1 py-0.5 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400">
                    {it.symbol}
                  </Link>
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-400">{it.name || "—"}</td>
                <td className="p-3 text-right font-medium text-slate-900 dark:text-white">{formatPrice(it.price, it.currency)}</td>
                <td className={`p-3 text-right font-medium ${changeClass}`}>
                  {percentChange.label}
                  {it.rawChange != null && (
                    <span className="ml-1 text-xs text-slate-500 dark:text-slate-500">{formatAbsoluteChange(it.rawChange, it.currency)}</span>
                  )}
                </td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatPrice(it.open, it.currency)}</td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                  {formatPrice(it.high, it.currency)}
                  <span className="mx-1 text-xs text-slate-400 dark:text-slate-600">/</span>
                  {formatPrice(it.low, it.currency)}
                </td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatPrice(it.previousClose, it.currency)}</td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatNumber(it.volume)}</td>
                <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatNumber(it.marketCap)}</td>
                <td className="p-3 text-slate-600 dark:text-slate-400">{it.sector || "—"}</td>
                <td className="p-3 text-slate-600 dark:text-slate-400">{it.country || "—"}</td>
                <td className="p-3 text-center">
                  <Sparkline data={it.sparkline} positive={sparkPositive} />
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => onToggleWatch?.(it)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-base text-blue-600 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                    aria-label={`Add ${it.symbol} to watchlist`}
                  >
                    ☆
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!items.length && (
        <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">No stocks match the current filters.</div>
      )}
    </div>
  );
}
