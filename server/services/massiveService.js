import axios from "axios";

const MASSIVE_API_BASE = process.env.MASSIVE_API_BASE || "https://api.massive.com";

const massiveClient = axios.create({
  baseURL: MASSIVE_API_BASE,
  timeout: 15000
});

function getAPIKey() {
  return process.env.MASSIVE_API_KEY;
}

function buildHeaders({ useBearer = true } = {}) {
  const key = getAPIKey();
  if (!key) return {};
  const authHeader = useBearer ? `Bearer ${key}` : key;
  return {
    Authorization: authHeader,
    "X-API-Key": key
  };
}

async function request(
  method,
  url,
  params = {},
  { attemptedStocksPrefix = false, attemptedAltAuth = false, attemptedBaseFallback = false } = {}
) {
  const MASSIVE_API_KEY = getAPIKey();
  if (!MASSIVE_API_KEY) {
    throw new Error("MASSIVE_API_KEY is not configured");
  }

  try {
    const { data } = await massiveClient.request({
      method,
      url,
      params: {
        apiKey: MASSIVE_API_KEY,
        apikey: MASSIVE_API_KEY,
        api_key: MASSIVE_API_KEY,
        ...params
      },
      headers: buildHeaders({ useBearer: !attemptedAltAuth })
    });
    return data;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 && !attemptedAltAuth) {
      return request(method, url, params, {
        attemptedStocksPrefix,
        attemptedAltAuth: true,
        attemptedBaseFallback
      });
    }
    if (status === 404 && !attemptedStocksPrefix && !url.startsWith("/stocks")) {
      const prefixedUrl = `/stocks${url.startsWith("/") ? url : `/${url}`}`;
      return request(method, prefixedUrl, params, { attemptedStocksPrefix: true });
    }
    if (status === 404 && !attemptedBaseFallback) {
      console.warn(`Massive endpoint ${url} returned 404 with base ${MASSIVE_API_BASE}, retrying default base`);
      const prevBase = massiveClient.defaults.baseURL;
      massiveClient.defaults.baseURL = "https://massive.io";
      try {
        return await request(method, url, params, {
          attemptedStocksPrefix,
          attemptedAltAuth,
          attemptedBaseFallback: true
        });
      } finally {
        massiveClient.defaults.baseURL = prevBase;
      }
    }

    const responseData = err?.response?.data;
    const message = responseData?.error || responseData?.message || err.message;
    const details = typeof responseData === "object" ? responseData : undefined;
    const error = new Error(message || "Massive API request failed");
    error.status = status;
    if (details) error.details = details;
    throw error;
  }
}

async function requestWithVersions(method, versions, buildPath, params = {}) {
  let lastError;
  for (const version of versions) {
    try {
      const path = buildPath(version);
      return await request(method, path, params);
    } catch (err) {
      if (err?.status === 404) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  if (lastError) throw lastError;
  throw new Error("Massive API request failed for all versions attempted");
}

export const massiveService = {
  getMarketStatusNow() {
    return request("get", "/v1/marketstatus/now");
  },

  getUpcomingMarketStatus() {
    return request("get", "/v1/marketstatus/upcoming");
  },

  getSnapshotsByDirection(direction, params = {}) {
    const path = `/v2/snapshot/locale/us/markets/stocks/${direction}`;
    return request("get", path, params);
  },

  getStockSnapshots(params = {}) {
    return request("get", "/v2/snapshot/locale/us/markets/stocks/tickers", params);
  },

  getGlobalSnapshot(params = {}) {
    return request("get", "/v3/snapshot", params);
  },

  getGroupedAggs(date, params = {}) {
    const path = `/v2/aggs/grouped/locale/us/market/stocks/${date}`;
    return request("get", path, params);
  },

  getStockQuote(ticker, params = {}) {
    const path = `/v3/quotes/${encodeURIComponent(ticker)}`;
    return request("get", path, params);
  },

  getLastTrade(ticker, params = {}) {
    const path = `/v2/last/trade/${encodeURIComponent(ticker)}`;
    return request("get", path, params);
  },

  getPreviousClose(ticker, params = {}) {
    const path = `/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev`;
    return request("get", path, params);
  },

  getOpenClose(ticker, date, params = {}) {
    const path = `/v1/open-close/${encodeURIComponent(ticker)}/${date}`;
    return request("get", path, params);
  },

  getAggregates(ticker, multiplier, timespan, from, to, params = {}) {
    const mult = Number.isFinite(Number(multiplier)) ? multiplier : 1;
    const path = `/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${mult}/${timespan}/${from}/${to}`;
    return request("get", path, params);
  },

  getTickerDetails(ticker, params = {}) {
    const path = `/v3/reference/tickers/${encodeURIComponent(ticker)}`;
    return request("get", path, params);
  },

  getTickers(params = {}) {
    return request("get", "/v3/reference/tickers", params);
  },

  getTickerTypes(params = {}) {
    return request("get", "/v3/reference/tickers/types", params);
  },

  getRelatedCompanies(ticker, params = {}) {
    const path = `/v1/related-companies/${encodeURIComponent(ticker)}`;
    return request("get", path, params);
  },

  getDividends(params = {}) {
    return request("get", "/stocks/v1/dividends", params);
  },

  getIndicators(ticker, indicator, params = {}) {
    const valid = new Set(["ema", "sma", "rsi", "macd"]);
    const key = indicator?.toLowerCase();
    if (!valid.has(key)) {
      throw new Error(`Unsupported Massive indicator: ${indicator}`);
    }
    const path = `/v1/indicators/${key}/${encodeURIComponent(ticker)}`;
    return request("get", path, params);
  },

  getReferenceNews(params = {}) {
    return requestWithVersions("get", ["v2", "v3"], (version) => `/${version}/reference/news`, params);
  },

  getTickerEvents(ticker, params = {}) {
    const encoded = encodeURIComponent(ticker);
    return requestWithVersions("get", ["v3", "v2"], (version) => `/${version}/reference/tickers/${encoded}/events`, params);
  }
};
