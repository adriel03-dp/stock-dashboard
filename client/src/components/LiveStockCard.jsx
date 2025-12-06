import { useEffect, useState } from "react";
import useStockStream from "../hooks/useStockStream";
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

function toNumber(value) {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (String(value).length <= 10) {
      return numeric * 1000;
    }
    return numeric;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function mergeEventIntoQuote(existing, event) {
  if (!event || typeof event !== "object") return existing;
  const next = existing ? { ...existing } : {};

  const price = toNumber(event.p ?? event.price ?? event.lastPrice ?? event.close ?? event.c);
  if (price != null) next.price = price;

  const change = toNumber(event.change ?? event.todaysChange ?? event.delta ?? event.dollarChange);
  if (change != null) next.change = change;

  const changePct = toNumber(event.changePercent ?? event.todaysChangePerc ?? event.percent ?? event.percentage ?? event.pctChange);
  if (changePct != null) {
    next.changePercent = changePct;
    next.changesPercentage = changePct;
  }

  const open = toNumber(event.o ?? event.open);
  if (open != null) next.open = open;

  const high = toNumber(event.h ?? event.high);
  if (high != null) next.high = high;

  const low = toNumber(event.l ?? event.low);
  if (low != null) next.low = low;

  const previousClose = toNumber(event.prevClose ?? event.previousClose ?? event.pc ?? event.c1);
  if (previousClose != null) next.previousClose = previousClose;

  const volume = toNumber(event.v ?? event.volume ?? event.accumulatedVolume ?? event.totalVolume);
  if (volume != null) next.volume = volume;

  const trades = toNumber(event.ticks ?? event.tradeCount ?? event.trades ?? event.n);
  if (trades != null) next.trades = trades;

  const vwap = toNumber(event.vw ?? event.vwap ?? event.volumeWeightedPrice);
  if (vwap != null) next.vwap = vwap;

  const timestampMs = normalizeTimestamp(event.t ?? event.timestamp ?? event.time ?? event.end ?? event.start);
  if (timestampMs != null) {
    next.timestamp = Math.floor(timestampMs / 1000);
  }

  next.lastEvent = event;
  return next;
}

export default function LiveStockCard({ symbol = "" }) {
  const ticker = symbol.trim().toUpperCase();
  const [quote, setQuote] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const { event: liveEvent, status: streamStatus } = useStockStream(ticker);

  useEffect(() => {
    let cancelled = false;

    if (!ticker) {
      setQuote(null);
      setError("Symbol required");
      return () => {
        cancelled = true;
      };
    }

    const fetchPrice = async () => {
      try {
        const response = await api.get(`/live/stock/${ticker}`);
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
        const message = err?.response?.data?.error || "Unable to load data";
        console.error("Failed to load", err);
        setQuote(null);
        setError(message);
      }
    };

    fetchPrice();

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    if (!liveEvent) return;
    setQuote((prev) => mergeEventIntoQuote(prev, liveEvent.data));
    setLastUpdated(Date.now());
    setError(null);
  }, [liveEvent]);

  const baseCardClasses =
    "flex min-w-[16rem] flex-1 flex-col justify-between rounded-2xl border border-white/10 bg-white/10 p-6 text-white shadow-lg shadow-black/20 backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/15";

  const streamLabel = (() => {
    switch (streamStatus) {
      case "connecting":
        return "Connecting…";
      case "ready":
        return "Live Ready";
      case "streaming":
        return "Live Updates";
      case "error":
        return "Stream Offline";
      default:
        return "Massive Snapshot";
    }
  })();

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
          {streamLabel}
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
