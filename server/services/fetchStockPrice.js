import axios from "axios";

const buildQuoteFromAggregate = (aggregate) => {
  if (!aggregate) return null;

  const close = Number(aggregate.c ?? NaN);
  const open = Number(aggregate.o ?? NaN);
  const change = Number.isFinite(close) && Number.isFinite(open) ? close - open : null;
  const changePct = Number.isFinite(change) && open !== 0 ? (change / open) * 100 : null;

  return {
    symbol: aggregate.T,
    price: close,
    change,
    changesPercentage: changePct,
    timestamp: aggregate.t ? Math.floor(aggregate.t / 1000) : null,
    open,
    high: aggregate.h,
    low: aggregate.l,
    volume: aggregate.v,
    vwap: aggregate.vw,
    trades: aggregate.n,
  };
};

export const fetchStockPrice = async (symbol) => {
  const apiKey =
    process.env.MASSIVE_API_KEY || process.env.Stockmarket_API_KEY || process.env.FMP_API_KEY;
  if (!apiKey) {
    console.error("Stock API error: missing stock market API key environment variable");
    return null;
  }

  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`;

  try {
    const res = await axios.get(url);
    const aggregate = res.data?.results?.[0];
    return buildQuoteFromAggregate(aggregate);
  } catch (err) {
    const message = err.response?.data || err.message;
    console.error("Stock API error:", message);
    return null;
  }
};
