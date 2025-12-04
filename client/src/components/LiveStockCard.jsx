import { useEffect, useState } from "react";
import { api } from "../utils/api";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const volumeFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const tradesFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? priceFormatter.format(Number(value)) : "--";

const formatCompact = (value, formatter) =>
  Number.isFinite(Number(value)) ? formatter.format(Number(value)) : "--";

export default function LiveStockCard({ symbol = "" }) {
  const ticker = symbol.trim().toUpperCase();
  const [quote, setQuote] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPrice = async () => {
      try {
        const response = await api.get(`/live/${ticker}`);
        if (cancelled) return;

        const payload = response.data;
        if (!payload) {
          setQuote(null);
          setError("No market data returned");
          return;
        }

        setQuote(payload);
        setLastUpdated(Date.now());
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load", err);
        setQuote(null);
        setError("Unable to load data");
      }
    };

    fetchPrice();
    const intervalId = setInterval(fetchPrice, 15000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [ticker]);

  const baseCardClasses =
    "flex min-w-[16rem] flex-1 flex-col justify-between rounded-2xl border border-white/10 bg-white/10 p-6 text-white shadow-lg shadow-black/20 backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/15";

  if (error) {
    return (
      <div className={`${baseCardClasses} items-center justify-center gap-2 text-center text-sm text-rose-300/90`}>
        <p className="font-medium">{ticker}</p>
        <p className="text-xs text-rose-200/80">{error}</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className={`${baseCardClasses} items-center justify-center text-sm text-white/70`}>
        <span className="loading">Loading...</span>
      </div>
    );
  }

  const priceValue = Number(quote.price);
  const openValue = Number(quote.open);
  const highValue = Number(quote.high);
  const lowValue = Number(quote.low);
  const vwapValue = Number(quote.vwap);
  const volumeValue = Number(quote.volume);
  const tradesValue = Number(quote.trades);

  const formattedPrice = formatCurrency(priceValue);

  const changeValue = Number(quote.change);
  const changePercent = Number(quote.changesPercentage);
  const showChange = Number.isFinite(changeValue) && Number.isFinite(changePercent);
  const changeColor = showChange && changeValue >= 0 ? "text-emerald-400" : "text-rose-400";
  const changeSign = showChange ? (changeValue >= 0 ? "+" : "-") : "";
  const changeIndicator = showChange ? (changeValue >= 0 ? "▲" : "▼") : "";
  const changeAmountLabel = showChange
    ? `${changeSign}${formatCurrency(Math.abs(changeValue))}`
    : "--";
  const changePercentLabel = showChange
    ? `${changeSign}${Math.abs(changePercent).toFixed(2)}%`
    : "--";
  const changeSummary = showChange
    ? `${changeIndicator} ${changeAmountLabel} • ${changePercentLabel}`
    : "--";

  const timestamp = quote.timestamp ? quote.timestamp * 1000 : lastUpdated;
  const lastUpdatedLabel = timestamp ? dateTimeFormatter.format(new Date(timestamp)) : "--";

  const dayRangeLabel = Number.isFinite(lowValue) && Number.isFinite(highValue)
    ? `${formatCurrency(lowValue)} – ${formatCurrency(highValue)}`
    : "--";
  const vwapLabel = formatCurrency(vwapValue);
  const volumeLabel = formatCompact(volumeValue, volumeFormatter);
  const tradesLabel = formatCompact(tradesValue, tradesFormatter);

  const sessionStats = [
    { label: "Open", value: formatCurrency(openValue) },
    { label: "Day Range", value: dayRangeLabel },
    { label: "VWAP", value: vwapLabel },
  ];

  const activityStats = [
    { label: "Volume", value: volumeLabel },
    { label: "Trades", value: tradesLabel },
    {
      label: "Change %",
      value: changePercentLabel,
      accentClass: showChange ? changeColor : "text-white/85",
    },
  ];

  return (
    <div className={`${baseCardClasses} space-y-7`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {(quote.symbol ?? ticker) || ticker}
          </h2>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Previous session</p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
          Massive Snapshot
        </span>
      </div>

      <div className="space-y-3">
        <p className="text-3xl font-semibold tracking-tight text-white">{formattedPrice}</p>
        <p className={`text-sm font-semibold ${showChange ? changeColor : "text-white/60"}`}>
          {changeSummary}
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Session Stats</p>
          <dl className="mt-2 grid grid-cols-2 gap-4 text-sm text-white/70 sm:grid-cols-3">
            {sessionStats.map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</dt>
                <dd className="font-medium text-white/85">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Market Activity</p>
          <dl className="mt-2 grid grid-cols-2 gap-4 text-sm text-white/70 sm:grid-cols-3">
            {activityStats.map(({ label, value, accentClass }) => (
              <div key={label} className="space-y-1">
                <dt className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</dt>
                <dd className={`font-medium ${accentClass ?? "text-white/85"}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <p className="text-xs text-white/60">Last update: {lastUpdatedLabel}</p>
    </div>
  );
}
