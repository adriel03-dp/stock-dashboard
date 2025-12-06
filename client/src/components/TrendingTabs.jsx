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
    <div className="grid gap-2">
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
          <div key={item.id} className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
            <div>
              <div className="font-semibold">
                {symbol} — {item.name}
              </div>
              <div
                className={`text-sm ${
                  positive == null
                    ? "text-gray-500"
                    : positive
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {priceLabel} • {changeLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAdd?.({ ...item, symbol })}
              disabled={disabled}
              className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
              aria-label={`Add ${symbol} to watchlist`}
            >
              +
            </button>
          </div>
        );
      })}
    </div>
  );
}
