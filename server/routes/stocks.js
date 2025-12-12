import express from "express";
import { massiveService } from "../services/massiveService.js";
import { generateMockStocks, generateMockStockDetail } from "../services/mockData.js";

const router = express.Router();

const RANGE_CONFIG = {
  "1D": { multiplier: 5, timespan: "minute", lookbackHours: 24 },
  "5D": { multiplier: 30, timespan: "minute", lookbackHours: 24 * 5 },
  "1M": { multiplier: 1, timespan: "day", lookbackDays: 30 },
  "3M": { multiplier: 1, timespan: "day", lookbackDays: 30 * 3 },
  "6M": { multiplier: 1, timespan: "day", lookbackDays: 30 * 6 },
  "1Y": { multiplier: 1, timespan: "day", lookbackDays: 365 },
  "5Y": { multiplier: 1, timespan: "week", lookbackDays: 365 * 5 },
  MAX: { multiplier: 1, timespan: "month", lookbackDays: 365 * 20 }
};

function toTimestamp(date) {
  return Math.floor(date.getTime());
}

function getRangeWindow(config) {
  const now = new Date();
  let start = new Date(now);

  if (config.lookbackHours) {
    start = new Date(now.getTime() - config.lookbackHours * 60 * 60 * 1000);
  } else if (config.lookbackDays) {
    start = new Date(now.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000);
  }

  return {
    from: toTimestamp(start),
    to: toTimestamp(now)
  };
}

function normalizeAggregates(payload) {
  if (!payload) return [];
  const list = Array.isArray(payload) ? payload : payload.results || payload.data || [];
  if (!Array.isArray(list)) return [];
  return list
    .map((point) => {
      const timestamp = point.t || point.timestamp || point.time || null;
      const open = point.o ?? point.open ?? null;
      const high = point.h ?? point.high ?? null;
      const low = point.l ?? point.low ?? null;
      const close = point.c ?? point.close ?? null;
      const volume = point.v ?? point.volume ?? null;
      if (!timestamp || close == null) return null;
      return { timestamp, open, high, low, close, volume };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function deriveMetricsFromHistory(history = []) {
  if (!Array.isArray(history) || !history.length) {
    return {
      high: null,
      low: null
    };
  }
  let high = Number.NEGATIVE_INFINITY;
  let low = Number.POSITIVE_INFINITY;

  history.forEach((point) => {
    if (point.high != null && Number.isFinite(Number(point.high))) {
      high = Math.max(high, Number(point.high));
    }
    if (point.low != null && Number.isFinite(Number(point.low))) {
      low = Math.min(low, Number(point.low));
    }
  });

  return {
    high: Number.isFinite(high) ? high : null,
    low: Number.isFinite(low) ? low : null
  };
}

function extractList(payload) {
  const list = payload?.results || payload?.events || payload?.tickers || payload?.data || payload?.items || [];
  return Array.isArray(list) ? list : [];
}

function toIsoString(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0 && String(value).length >= 10) {
    const millis = String(value).length <= 10 ? numeric * 1000 : numeric;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeTickerEvent(item) {
  if (!item || typeof item !== "object") return null;
  const start = item.event_date || item.start_date || item.startDate || item.date || item.timestamp || null;
  const end = item.end_date || item.endDate || item.finish_date || null;

  const tickerList = item.tickers || item.related_tickers || item.symbols || item.ticker || [];
  const tickers = Array.isArray(tickerList) ? tickerList : [tickerList].filter(Boolean);

  const categories = item.categories || item.category || item.event_types || item.eventType || [];
  const normalizedCategories = Array.isArray(categories) ? categories : [categories].filter(Boolean);

  const id = item.id || item.event_id || item.uuid || `${item.type || item.event_type || "event"}-${start || Date.now()}`;

  return {
    id,
    type: item.type || item.event_type || item.kind || null,
    title: item.title || item.headline || item.summary || item.description || null,
    description: item.description || item.notes || item.details || null,
    status: item.status || item.state || null,
    startDate: toIsoString(start),
    endDate: toIsoString(end),
    timezone: item.timezone || item.time_zone || null,
    url: item.url || item.link || item.article_url || null,
    source: item.source || item.source_name || null,
    tickers,
    categories: normalizedCategories,
    raw: item
  };
}

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500);
    const cursor = req.query.cursor;
    const search = req.query.search;
    const sector = req.query.sector;
    const country = req.query.country;

    // Use mock data if API key is not configured
    if (!process.env.MASSIVE_API_KEY) {
      const items = generateMockStocks(limit);
      return res.json({ items, nextCursor: null });
    }

    const params = {
      market: "stocks",
      active: "true",
      limit,
      sort: "ticker.asc"
    };

    if (cursor) params.cursor = cursor;
    if (search) params.search = search;
    if (sector) params.sector = sector;
    if (country) params.locale = country;

    const tickersResponse = await massiveService.getTickers(params);
    const tickers = Array.isArray(tickersResponse?.results) ? tickersResponse.results : [];
    const symbols = tickers.map((t) => t.ticker).filter(Boolean);

    let snapshotMap = new Map();
    if (symbols.length) {
      try {
        const snapshotResponse = await massiveService.getStockSnapshots({ tickers: symbols.join(",") });
        const snapshotList = Array.isArray(snapshotResponse?.tickers)
          ? snapshotResponse.tickers
          : Array.isArray(snapshotResponse?.results)
          ? snapshotResponse.results
          : [];
        snapshotMap = new Map(
          snapshotList
            .map((entry) => {
              const symbol = entry?.ticker || entry?.symbol;
              return symbol ? [symbol, entry] : null;
            })
            .filter(Boolean)
        );
      } catch (err) {
        console.warn("Failed to load snapshots", err.message);
      }
    }

    const items = tickers.map((ticker) => {
      const symbol = ticker?.ticker;
      const snapshot = snapshotMap.get(symbol) || {};
      const day = snapshot.day || {};
      const lastQuote = snapshot.lastQuote || {};
      const lastTrade = snapshot.lastTrade || {};

      const price = lastTrade.price ?? snapshot.close ?? day.close ?? ticker?.lastQuote?.price ?? null;
      const previousClose = day.close ?? snapshot.previousClose ?? ticker?.prevDay?.close ?? null;
      const change = snapshot.todaysChange ?? day.change ?? (price != null && previousClose != null ? price - previousClose : null);
      const changePercent = snapshot.todaysChangePerc ?? day.changePerc ?? (change != null && previousClose ? (change / previousClose) * 100 : null);

      return {
        symbol,
        name: ticker?.name || ticker?.company_name || symbol,
        price,
        change,
        changePercent,
        open: day.open ?? snapshot.open ?? lastQuote.open ?? null,
        high: day.high ?? snapshot.high ?? lastQuote.high ?? null,
        low: day.low ?? snapshot.low ?? lastQuote.low ?? null,
        previousClose,
        volume: day.volume ?? snapshot.volume ?? lastQuote.volume ?? ticker?.volume ?? null,
        marketCap: snapshot.marketCap ?? ticker?.market_cap ?? ticker?.marketCap ?? null,
        sector: ticker?.sic_description || ticker?.sector || ticker?.industry || null,
        country: ticker?.locale || ticker?.country || null,
        currency: ticker?.currency_name || ticker?.currency || lastQuote?.currency || "USD",
        exchange: ticker?.primary_exchange || ticker?.primary_exchange_symbol || ticker?.market || null,
        sparkline: snapshot?.min?.prices || snapshot?.intraday?.prices || null,
        raw: {
          ticker,
          snapshot
        }
      };
    });

    const nextUrl = tickersResponse?.next_url || tickersResponse?.nextUrl || null;
    let nextCursor = null;
    if (nextUrl) {
      try {
        const url = new URL(nextUrl);
        nextCursor = url.searchParams.get("cursor") || nextUrl;
      } catch (err) {
        nextCursor = nextUrl;
      }
    }

    res.json({
      items,
      nextCursor,
      requestId: tickersResponse?.request_id || null
    });
  } catch (err) {
    console.error("stocks error:", err?.details || err?.message || err);
    // Fall back to mock data on error
    const limit = Math.min(Math.max(Number(req.query.limit ?? 100), 1), 500);
    const items = generateMockStocks(limit);
    return res.json({ items, nextCursor: null });
  }
});

router.get("/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol || "").trim().toUpperCase();
  if (!symbol) {
    return res.status(400).json({ error: "Symbol is required" });
  }

  try {
    // Use mock data if API key is not configured
    if (!process.env.MASSIVE_API_KEY) {
      return res.json(generateMockStockDetail(symbol));
    }
    const [quoteResp, snapshotResp, detailsResp, relatedResp, dividendsResp, eventsResp] = await Promise.all([
      massiveService.getStockQuote(symbol).catch(() => null),
      massiveService.getStockSnapshots({ tickers: symbol }).catch(() => null),
      massiveService.getTickerDetails(symbol).catch(() => null),
      massiveService.getRelatedCompanies(symbol).catch(() => null),
      massiveService.getDividends({ ticker: symbol, limit: 50, sort: "record_date.desc" }).catch(() => null),
      massiveService.getTickerEvents(symbol, { limit: 25 }).catch((err) => {
        if (err?.status === 404 || err?.status === 400 || err?.status === 401 || err?.status === 403) return null;
        throw err;
      })
    ]);

    const quote = Array.isArray(quoteResp?.results) ? quoteResp.results[0] : quoteResp?.results || null;
    const snapshot = Array.isArray(snapshotResp?.tickers)
      ? snapshotResp.tickers[0]
      : Array.isArray(snapshotResp?.results)
      ? snapshotResp.results[0]
      : snapshotResp?.ticker || snapshotResp || null;
    const details = detailsResp?.results || detailsResp || null;

    const lastTrade = snapshot?.lastTrade || quote?.last || {};
    const day = snapshot?.day || {};
    const prevDay = snapshot?.prevDay || {};
    const session = snapshot?.session || {};

    const price = lastTrade.price ?? day.close ?? quote?.price ?? quote?.p ?? null;
    const previousClose = day.close ?? prevDay.close ?? quote?.previousClose ?? quote?.prevClose ?? null;
    const change = snapshot?.todaysChange ?? day.change ?? (price != null && previousClose != null ? price - previousClose : null);
    const changePercent = snapshot?.todaysChangePerc ?? day.changePerc ?? (change != null && previousClose ? (change / previousClose) * 100 : null);

    const summary = {
      symbol,
      name: details?.name || snapshot?.name || snapshot?.ticker || quote?.ticker || symbol,
      price,
      change,
      changePercent,
      currency: details?.currency_name || snapshot?.currency || quote?.currency || "USD",
      exchange: details?.primary_exchange || snapshot?.market || snapshot?.primary_exchange || quote?.exchange || null,
      marketStatus: session?.marketStatus || snapshot?.marketStatus || null,
      lastUpdated: lastTrade?.timestamp || snapshot?.updated || quote?.last_updated || Date.now()
    };

    const metrics = {
      open: day.open ?? quote?.open ?? null,
      previousClose,
      high: day.high ?? quote?.high ?? null,
      low: day.low ?? quote?.low ?? null,
      avgVolume: details?.average_volume ?? day.volume ?? quote?.volume ?? null,
      volume: day.volume ?? quote?.volume ?? null,
      week52High: details?.week_52_high ?? null,
      week52Low: details?.week_52_low ?? null,
      marketCap: snapshot?.marketCap ?? details?.market_cap ?? null,
      peRatio: details?.pe_ratio ?? quote?.peRatio ?? null,
      eps: details?.eps ?? details?.earnings_per_share ?? null,
      beta: details?.beta ?? null,
      sharesOutstanding: details?.share_class_shares_outstanding ?? details?.weighted_shares_outstanding ?? null,
      dividendYield: details?.dividend_yield ?? null,
      earningsDate: details?.earnings?.next_report_date || details?.next_earnings_date || null
    };

    const profile = {
      description: details?.description || null,
      sector: details?.sic_description || details?.sector || null,
      industry: details?.industry || null,
      ceo: details?.ceo || details?.chief_executive_officer || null,
      employees: details?.total_employees || details?.employees || null,
      website: details?.homepage_url || details?.website || null,
      address: details?.address || details?.address1 || null,
      city: details?.city || null,
      state: details?.state || null,
      country: details?.locale || details?.country || null,
      founded: details?.founded || details?.list_date || null
    };

    const indicatorRequests = [
      massiveService.getIndicators(symbol, "ema", {
        timespan: "day",
        window: 50,
        adjusted: true,
        series_type: "close",
        order: "desc",
        limit: 1
      }).catch(() => null),
      massiveService.getIndicators(symbol, "ema", {
        timespan: "day",
        window: 200,
        adjusted: true,
        series_type: "close",
        order: "desc",
        limit: 1
      }).catch(() => null),
      massiveService.getIndicators(symbol, "rsi", {
        timespan: "day",
        adjusted: true,
        series_type: "close",
        order: "desc",
        limit: 1
      }).catch(() => null),
      massiveService.getIndicators(symbol, "macd", {
        timespan: "day",
        adjusted: true,
        series_type: "close",
        order: "desc",
        limit: 1
      }).catch(() => null)
    ];

    const indicatorResults = await Promise.all(indicatorRequests);

    const indicators = {
      ema50: indicatorResults[0]?.results?.values?.[0]?.value ?? null,
      ema200: indicatorResults[1]?.results?.values?.[0]?.value ?? null,
      rsi: indicatorResults[2]?.results?.values?.[0]?.value ?? null,
      macd: indicatorResults[3]?.results?.values?.[0] ?? null
    };

    const historyEntries = await Promise.all(
      Object.entries(RANGE_CONFIG).map(async ([range, config]) => {
        const { from, to } = getRangeWindow(config);
        try {
          const response = await massiveService.getAggregates(
            symbol,
            config.multiplier,
            config.timespan,
            from,
            to,
            { adjusted: true, sort: "asc" }
          );
          return [range, normalizeAggregates(response?.results || response)];
        } catch (err) {
          return [range, []];
        }
      })
    );

    const history = historyEntries.reduce((acc, [range, values]) => {
      acc[range] = values;
      return acc;
    }, {});

    if (!metrics.week52High || !metrics.week52Low) {
      const oneYearMetrics = deriveMetricsFromHistory(history["1Y"] || []);
      metrics.week52High = metrics.week52High ?? oneYearMetrics.high;
      metrics.week52Low = metrics.week52Low ?? oneYearMetrics.low;
    }

    const dividends = extractList(dividendsResp).map((item) => ({
      id: item.id,
      cashAmount: item.cash_amount ?? item.cashAmount ?? null,
      currency: item.currency || "USD",
      recordDate: item.record_date || item.recordDate || null,
      payDate: item.pay_date || item.payDate || null,
      declarationDate: item.declaration_date || item.declarationDate || null,
      frequency: item.frequency || null
    }));

    const related = extractList(relatedResp).map((item) => ({
      symbol: item.ticker || item.symbol,
      name: item.name || item.company_name || item.ticker,
      matchScore: item.match_score ?? item.score ?? null
    }));

    const events = extractList(eventsResp).map(normalizeTickerEvent).filter(Boolean);

    res.json({
      summary,
      metrics,
      profile,
      indicators,
      history,
      dividends,
      related,
      events,
      raw: {
        quote,
        snapshot,
        details
      }
    });
  } catch (err) {
    console.error(`/stocks/${req.params.symbol} error:`, err?.details || err?.message || err);
    res.status(err.status || 500).json({ error: "Failed to load stock detail", details: err.message });
  }
});

export default router;
