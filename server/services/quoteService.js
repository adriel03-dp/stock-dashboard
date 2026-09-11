import { fetchMassiveStockSummary } from "../utils/stockData.js";
import { fetchFinnhubQuote } from "./finnhubMarketService.js";
import { fetchAVQuote } from "./alphaVantageService.js";

const FRESH_TTL_MS = 30_000;
const STALE_TTL_MS = 45 * 60_000;

const quoteCache = new Map();
const pendingQuotes = new Map();

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

function withCacheMetadata(value, entry, stale = false) {
  return {
    ...value,
    cachedAt: new Date(entry.updatedAt).toISOString(),
    cacheAgeMs: Math.max(0, Date.now() - entry.updatedAt),
    isStale: stale
  };
}

function configuredProviders() {
  const providers = [];

  if (process.env.MASSIVE_API_KEY) {
    providers.push({
      name: "Massive",
      fetch: fetchMassiveStockSummary
    });
  }

  if (process.env.FINNHUB_API_KEY) {
    providers.push({
      name: "Finnhub",
      fetch: fetchFinnhubQuote
    });
  }

  if (process.env.ALPHA_VANTAGE_API_KEY) {
    providers.push({
      name: "AlphaVantage",
      fetch: fetchAVQuote
    });
  }

  return providers;
}

async function fetchFromProviders(symbol) {
  const failures = [];

  for (const provider of configuredProviders()) {
    try {
      const quote = await provider.fetch(symbol);
      if (quote?.price != null && Number.isFinite(Number(quote.price))) {
        return {
          ...quote,
          symbol: quote.symbol || symbol,
          price: Number(quote.price),
          provider: quote.provider || provider.name
        };
      }
      failures.push(`${provider.name}: no quote returned`);
    } catch (error) {
      failures.push(`${provider.name}: ${error.message}`);
    }
  }

  const error = new Error(failures.length ? failures.join("; ") : "No stock quote provider is configured");
  error.code = "QUOTE_UNAVAILABLE";
  throw error;
}

/**
 * Returns a quote that is fresh for 30 seconds. When every provider is
 * unavailable or rate-limited, the last successful quote remains usable for
 * up to 45 minutes. Concurrent callers for the same symbol share one request.
 */
export async function getStockQuote(symbol, { forceRefresh = false } = {}) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) throw new Error("Symbol is required");

  const cached = quoteCache.get(normalized);
  const age = cached ? Date.now() - cached.updatedAt : Number.POSITIVE_INFINITY;

  if (!forceRefresh && cached && age <= FRESH_TTL_MS) {
    return withCacheMetadata(cached.value, cached, false);
  }

  if (pendingQuotes.has(normalized)) return pendingQuotes.get(normalized);

  const request = (async () => {
    try {
      const value = await fetchFromProviders(normalized);
      const entry = { value, updatedAt: Date.now() };
      quoteCache.set(normalized, entry);
      return withCacheMetadata(value, entry, false);
    } catch (error) {
      const currentAge = cached ? Date.now() - cached.updatedAt : Number.POSITIVE_INFINITY;
      if (cached && currentAge <= STALE_TTL_MS) {
        return withCacheMetadata(cached.value, cached, true);
      }
      throw error;
    } finally {
      pendingQuotes.delete(normalized);
    }
  })();

  pendingQuotes.set(normalized, request);
  return request;
}

export const quoteCachePolicy = Object.freeze({
  freshTtlMs: FRESH_TTL_MS,
  staleTtlMs: STALE_TTL_MS
});
