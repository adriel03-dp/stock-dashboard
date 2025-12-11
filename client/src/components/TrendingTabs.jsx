import { motion } from "framer-motion";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

function parsePercent(value) {
  if (value == null) return null;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/%/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatPercent(value) {
  const numeric = parsePercent(value);
  if (numeric == null) return "—";
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

export default function TrendingTabs({ list = [], onAdd, pendingId }) {
  return (
    <div className="grid gap-3">
      {list.map((item) => {
        const symbol = item.symbol ? item.symbol.toUpperCase() : item.id;
        const priceLabel = Number.isFinite(Number(item.price))
          ? priceFormatter.format(Number(item.price))
          : "—";
        const changeValue = parsePercent(item.change);
        const changeLabel = formatPercent(item.change);
        const positive = changeValue == null ? null : changeValue >= 0;
        const disabled = !onAdd || pendingId === item.id;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3, scale: 1.005 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 dark:text-white">
                {symbol} <span className="text-sm text-slate-500 dark:text-slate-400">{item.name}</span>
              </div>
              <div
                className={`text-sm font-medium ${
                  positive == null
                    ? "text-slate-500 dark:text-slate-400"
                    : positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {priceLabel} • {changeLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAdd?.({ ...item, symbol })}
              disabled={disabled}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-sky-500 to-indigo-500 text-base font-semibold text-white shadow-md shadow-blue-500/30 transition disabled:opacity-50"
              aria-label={`Add ${symbol} to watchlist`}
            >
              <span className="-translate-y-[1px] text-lg">+</span>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
