import axios from "axios";

const FMP_KEY = process.env.FMP_API_KEY || "";
const client = axios.create({
  baseURL: "https://financialmodelingprep.com/api/v3"
});

async function request(url, params = {}) {
  if (!FMP_KEY) return null;
  try {
    const { data } = await client.get(url, {
      params: { ...params, apikey: FMP_KEY }
    });
    return data;
  } catch (err) {
    const message = err?.response?.data || err.message;
    console.error("FMP error:", message);
    throw new Error(typeof message === "string" ? message : "FMP request failed");
  }
}

export async function fetchQuoteFMP(symbol) {
  try {
    const data = await request(`/quote/${encodeURIComponent(symbol)}`);
    return data?.[0] ?? null;
  } catch (err) {
    return null;
  }
}

export async function fetchHistoricalFMP(symbol) {
  try {
    return await request(`/historical-chart/1day/${encodeURIComponent(symbol)}`);
  } catch (err) {
    return null;
  }
}

export async function fetchStockScreener(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit ?? 100), 1), 200);
  const offset = Math.max(Number(options.offset ?? 0), 0);

  const params = {
    limit,
    offset
  };

  if (options.exchange) params.exchange = options.exchange;
  if (options.sector) params.sector = options.sector;
  if (options.industry) params.industry = options.industry;
  if (options.country) params.country = options.country;
  if (options.marketCapMoreThan) params.marketCapMoreThan = Number(options.marketCapMoreThan);
  if (options.marketCapLessThan) params.marketCapLessThan = Number(options.marketCapLessThan);
  if (options.priceMoreThan) params.priceMoreThan = Number(options.priceMoreThan);
  if (options.priceLessThan) params.priceLessThan = Number(options.priceLessThan);

  const data = await request("/stock-screener", params);
  return Array.isArray(data) ? data : [];
}

export async function fetchStockUniverse(options = {}) {
  const totalLimit = Math.min(Math.max(Number(options.limit ?? 500), 1), 5000);
  const offset = Math.max(Number(options.offset ?? 0), 0);
  const batchSize = Math.min(totalLimit, 200);
  const results = [];

  let remaining = totalLimit;
  let currentOffset = offset;

  while (remaining > 0) {
    const currentLimit = Math.min(batchSize, remaining);
    const batch = await fetchStockScreener({
      ...options,
      limit: currentLimit,
      offset: currentOffset
    });

    if (!batch.length) break;

    results.push(...batch);
    remaining -= batch.length;
    currentOffset += batch.length;

    if (batch.length < currentLimit) break;
  }

  return results.slice(0, totalLimit);
}

export function normalizeQuote(quote, fallbackSymbol) {
  if (!quote) return null;
  return {
    symbol: quote.symbol || fallbackSymbol,
    name: quote.name || fallbackSymbol,
    price: quote.price ?? quote.c ?? null,
    change: quote.change ?? quote.d ?? null,
    changePercent: quote.changesPercentage ?? quote.dp ?? null,
    open: quote.open ?? quote.o ?? null,
    high: quote.dayHigh ?? quote.h ?? null,
    low: quote.dayLow ?? quote.l ?? null,
    previousClose: quote.previousClose ?? quote.pc ?? null,
    volume: quote.volume ?? quote.v ?? null,
    updatedAt: quote.timestamp ? new Date(quote.timestamp * 1000).toISOString() : quote.lastUpdated ?? null
  };
}

export function normalizeHistory(history = []) {
  return history
    .slice()
    .reverse()
    .map((point) => ({
      date: (() => {
        const raw = point.date || point.label || point.t || point.timestamp;
        if (!raw) return null;
        if (typeof raw === "number") return new Date(raw).toISOString();
        const str = String(raw);
        if (!Number.isNaN(Date.parse(str))) return new Date(str).toISOString();
        return str;
      })(),
      close: point.close ?? point.c ?? null
    }))
    .filter((point) => point.date && point.close !== null);
}
