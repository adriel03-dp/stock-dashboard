import axios from "axios";

const AV_BASE = "https://www.alphavantage.co/query";
const REQUEST_TIMEOUT = 15000;

// Rate-limit: free tier allows 25 req/day, 5 req/min
const avClient = axios.create({ baseURL: AV_BASE, timeout: REQUEST_TIMEOUT });

function apiKey() {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not configured");
  return key;
}

// Simple in-memory cache to respect rate limits
const cache = new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > entry.ttl) return null;
  return entry.value;
}
function getStale(key, staleTtlMs = 45 * 60_000) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > staleTtlMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}
function setCached(key, value, ttlMs) {
  cache.set(key, { value, at: Date.now(), ttl: ttlMs });
}

async function avGet(params, cacheKey, ttlMs = 60_000) {
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  try {
    const { data } = await avClient.get("", { params: { ...params, apikey: apiKey() } });
    if (data?.["Information"] || data?.["Note"]) {
      throw new Error(`Alpha Vantage rate limit: ${data["Information"] || data["Note"]}`);
    }
    if (cacheKey) setCached(cacheKey, data, ttlMs);
    return data;
  } catch (error) {
    const stale = cacheKey ? getStale(cacheKey) : null;
    if (stale) return stale;
    throw error;
  }
}

// Global Quote
export async function fetchAVQuote(symbol) {
  const data = await avGet({ function: "GLOBAL_QUOTE", symbol }, `quote:${symbol}`, 30_000);
  const q = data?.["Global Quote"];
  if (!q || !q["05. price"]) return null;
  const price = Number(q["05. price"]);
  const prevClose = Number(q["08. previous close"]);
  const change = Number(q["09. change"]);
  const changePctRaw = String(q["10. change percent"] || "").replace("%", "");
  const changePercent = Number(changePctRaw);
  return {
    symbol: q["01. symbol"] || symbol,
    price,
    open: Number(q["02. open"]) || null,
    high: Number(q["03. high"]) || null,
    low: Number(q["04. low"]) || null,
    previousClose: prevClose || null,
    change: Number.isFinite(change) ? change : null,
    changePercent: Number.isFinite(changePercent) ? changePercent : null,
    volume: Number(q["06. volume"]) || null,
    latestTradingDay: q["07. latest trading day"] || null,
    provider: "AlphaVantage"
  };
}

// Company Overview
export async function fetchAVOverview(symbol) {
  const data = await avGet({ function: "OVERVIEW", symbol }, `overview:${symbol}`, 24 * 60 * 60_000);
  if (!data?.Symbol) return null;
  return {
    symbol: data.Symbol,
    name: data.Name || symbol,
    sector: data.Sector || null,
    industry: data.Industry || null,
    marketCap: Number(data.MarketCapitalization) || null,
    peRatio: Number(data.PERatio) || null,
    eps: Number(data.EPS) || null,
    beta: Number(data.Beta) || null,
    dividendYield: Number(data.DividendYield) || null,
    week52High: Number(data["52WeekHigh"]) || null,
    week52Low: Number(data["52WeekLow"]) || null,
    exchange: data.Exchange || null,
    currency: data.Currency || "USD",
    country: data.Country || "USA",
    description: data.Description || null,
    employees: Number(data.FullTimeEmployees) || null,
    website: data.OfficialSite || null,
    sharesOutstanding: Number(data.SharesOutstanding) || null,
    provider: "AlphaVantage"
  };
}

// Symbol search is used by portfolio/watchlist selectors. A long cache keeps
// type-ahead interactions from consuming the free daily request allowance.
export async function searchAVSymbols(keywords, limit = 10) {
  const query = String(keywords || "").trim();
  if (!query) return [];

  const normalizedQuery = query.toUpperCase();
  const data = await avGet(
    { function: "SYMBOL_SEARCH", keywords: query },
    `symbol_search:${normalizedQuery}`,
    12 * 60 * 60_000
  );

  const matches = Array.isArray(data?.bestMatches) ? data.bestMatches : [];
  return matches.slice(0, Math.min(Math.max(Number(limit) || 10, 1), 20)).map((match) => ({
    symbol: match["1. symbol"],
    name: match["2. name"] || match["1. symbol"],
    type: match["3. type"] || null,
    region: match["4. region"] || null,
    currency: match["8. currency"] || null,
    matchScore: Number(match["9. matchScore"]) || null,
    provider: "AlphaVantage"
  })).filter((match) => match.symbol);
}

// Top Gainers, Losers, Most Active
export async function fetchAVTopMovers() {
  const data = await avGet({ function: "TOP_GAINERS_LOSERS" }, "top_movers", 5 * 60_000);

  function normalizeMovers(list = []) {
    return list.map((item) => {
      const pctRaw = String(item.change_percentage || "").replace("%", "");
      return {
        symbol: item.ticker,
        name: item.ticker,
        price: Number(item.price) || null,
        change: Number(item.change_amount) || null,
        changePercent: Number(pctRaw) || null,
        volume: Number(item.volume) || null,
        provider: "AlphaVantage"
      };
    }).filter((x) => x.symbol && x.price != null);
  }

  return {
    topGainers: normalizeMovers(data?.top_gainers),
    topLosers: normalizeMovers(data?.top_losers),
    mostActive: normalizeMovers(data?.most_actively_traded),
    lastUpdated: data?.last_updated || null,
    provider: "AlphaVantage"
  };
}

// Market Overview (for /market/overview route)
export async function fetchAVMarketOverview(limit = 5) {
  const movers = await fetchAVTopMovers();

  const topGainers = movers.topGainers.slice(0, limit);
  const topLosers = movers.topLosers.slice(0, limit);
  const mostActive = movers.mostActive.slice(0, limit);
  // Alpha Vantage's movers response has no market-cap field. Do not label
  // volume-ranked symbols as market-cap leaders.
  const topMarketCap = [];

  const allQuoted = [...movers.topGainers, ...movers.topLosers, ...movers.mostActive];
  const unique = [...new Map(allQuoted.map((x) => [x.symbol, x])).values()];
  const advancing = unique.filter((x) => (x.changePercent ?? 0) > 0).length;
  const declining = unique.filter((x) => (x.changePercent ?? 0) < 0).length;
  const unchanged = unique.length - advancing - declining;

  return {
    highlights: { topGainers, topLosers, mostActive, topMarketCap },
    breadth: {
      total: unique.length,
      advancing,
      declining,
      unchanged,
      advancingPct: unique.length ? (advancing / unique.length) * 100 : 0,
      decliningPct: unique.length ? (declining / unique.length) * 100 : 0,
      unchangedPct: unique.length ? (unchanged / unique.length) * 100 : 0
    },
    source: "AlphaVantage"
  };
}

// Sector Performance
// AV free tier doesn't have a dedicated sector endpoint, so we build sector
// data from the movers list + a curated map of representative sector symbols.
const SECTOR_SYMBOLS = {
  "Technology": ["AAPL","MSFT","NVDA","AVGO","AMD","INTC","ORCL","CRM","ADBE","QCOM"],
  "Communication Services": ["GOOGL","META","NFLX","T","VZ","DIS","CHTR","TMUS"],
  "Consumer Discretionary": ["AMZN","TSLA","MCD","NKE","LOW","HD","TGT","SBUX"],
  "Financials": ["JPM","V","MA","BAC","WFC","GS","MS","AXP"],
  "Health Care": ["UNH","JNJ","LLY","ABBV","MRK","PFE","TMO","ABT"],
  "Industrials": ["GE","CAT","RTX","BA","UPS","HON","LMT","DE"],
  "Consumer Staples": ["WMT","PG","KO","PEP","COST","MO","PM"],
  "Energy": ["XOM","CVX","COP","SLB","EOG","PSX","MPC"],
  "Real Estate": ["AMT","PLD","EQIX","SPG","O","DLR"],
  "Materials": ["LIN","APD","SHW","FCX","NEM","NUE"],
  "Utilities": ["NEE","DUK","SO","AEP","EXC","SRE"]
};

export async function fetchAVSectors() {
  const cacheKey = "av_sectors";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Build a quote map by combining AV movers (real-time) + Finnhub individual quotes
  // This gives us broad sector coverage even when AV rate limits are hit
  const quoteMap = new Map();

  // Try to get AV movers (cached for 5 min, uses 1 request per call)
  try {
    const movers = await fetchAVTopMovers();
    const allMovers = [...movers.topGainers, ...movers.topLosers, ...movers.mostActive];
    allMovers.forEach((x) => { if (x.symbol) quoteMap.set(x.symbol, x); });
  } catch (_) { /* rate limited — proceed with Finnhub data only */ }

  // Use Finnhub to fill in quotes for sector symbols not covered by movers
  // Finnhub is already used in the overview route so it's typically warm/cached
  const { fetchFinnhubQuote: getFinnhubQuote } = await import("./finnhubMarketService.js");
  const allSectorSymbols = [...new Set(Object.values(SECTOR_SYMBOLS).flat())];
  const missing = allSectorSymbols.filter((s) => !quoteMap.has(s));

  // Fetch missing quotes from Finnhub in parallel (Finnhub allows more requests)
  await Promise.allSettled(
    missing.map(async (sym) => {
      try {
        const q = await getFinnhubQuote(sym);
        if (q) quoteMap.set(sym, { symbol: sym, name: sym, price: q.price, change: q.change, changePercent: q.changePercent, volume: null, provider: "Finnhub" });
      } catch (_) {}
    })
  );

  const sectors = [];
  for (const [sectorName, symbols] of Object.entries(SECTOR_SYMBOLS)) {
    const companies = symbols
      .map((sym) => quoteMap.get(sym))
      .filter(Boolean)
      .map((q) => ({
        symbol: q.symbol,
        name: q.name || q.symbol,
        price: q.price,
        changePercent: q.changePercent,
        marketCap: null
      }));

    if (!companies.length) continue;

    const withChange = companies.filter((c) => c.changePercent != null);
    const advancing = withChange.filter((c) => c.changePercent > 0).length;
    const declining = withChange.filter((c) => c.changePercent < 0).length;
    const unchanged = companies.length - advancing - declining;
    const avgChange = withChange.length
      ? withChange.reduce((sum, c) => sum + c.changePercent, 0) / withChange.length
      : null;

    sectors.push({
      name: sectorName,
      changePercent: avgChange,
      totalMarketCap: null,
      totalVolume: null,
      symbols: companies.length,
      advancers: advancing,
      decliners: declining,
      unchanged,
      topConstituents: companies.slice(0, 5),
      topMovers: {
        gainers: [...withChange].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3),
        losers: [...withChange].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3)
      }
    });
  }

  if (!sectors.length) throw new Error("No sector data could be built");

  const result = { sectors, source: "AlphaVantage+Finnhub" };
  setCached(cacheKey, result, 10 * 60_000); // cache 10 min
  return result;
}

// Stock Listing (for /stocks route)
const BROAD_STOCK_UNIVERSE = [
  ["AAPL","Apple Inc.","Technology","NASDAQ"],
  ["MSFT","Microsoft Corporation","Technology","NASDAQ"],
  ["NVDA","NVIDIA Corporation","Technology","NASDAQ"],
  ["AMZN","Amazon.com Inc.","Consumer Discretionary","NASDAQ"],
  ["GOOGL","Alphabet Inc.","Communication Services","NASDAQ"],
  ["META","Meta Platforms Inc.","Communication Services","NASDAQ"],
  ["TSLA","Tesla Inc.","Consumer Discretionary","NASDAQ"],
  ["AVGO","Broadcom Inc.","Technology","NASDAQ"],
  ["JPM","JPMorgan Chase & Co.","Financials","NYSE"],
  ["V","Visa Inc.","Financials","NYSE"],
  ["WMT","Walmart Inc.","Consumer Staples","NYSE"],
  ["MA","Mastercard Inc.","Financials","NYSE"],
  ["UNH","UnitedHealth Group Inc.","Health Care","NYSE"],
  ["XOM","Exxon Mobil Corporation","Energy","NYSE"],
  ["LLY","Eli Lilly and Company","Health Care","NYSE"],
  ["JNJ","Johnson & Johnson","Health Care","NYSE"],
  ["PG","Procter & Gamble Co.","Consumer Staples","NYSE"],
  ["HD","The Home Depot Inc.","Consumer Discretionary","NYSE"],
  ["ABBV","AbbVie Inc.","Health Care","NYSE"],
  ["MRK","Merck & Co. Inc.","Health Care","NYSE"],
  ["ORCL","Oracle Corporation","Technology","NYSE"],
  ["BAC","Bank of America Corp.","Financials","NYSE"],
  ["COST","Costco Wholesale Corporation","Consumer Staples","NASDAQ"],
  ["CRM","Salesforce Inc.","Technology","NYSE"],
  ["CVX","Chevron Corporation","Energy","NYSE"],
  ["AMD","Advanced Micro Devices Inc.","Technology","NASDAQ"],
  ["ADBE","Adobe Inc.","Technology","NASDAQ"],
  ["NFLX","Netflix Inc.","Communication Services","NASDAQ"],
  ["KO","The Coca-Cola Company","Consumer Staples","NYSE"],
  ["PEP","PepsiCo Inc.","Consumer Staples","NASDAQ"],
  ["TMO","Thermo Fisher Scientific Inc.","Health Care","NYSE"],
  ["MCD","McDonald's Corporation","Consumer Discretionary","NYSE"],
  ["CSCO","Cisco Systems Inc.","Technology","NASDAQ"],
  ["WFC","Wells Fargo & Company","Financials","NYSE"],
  ["ABT","Abbott Laboratories","Health Care","NYSE"],
  ["GS","The Goldman Sachs Group Inc.","Financials","NYSE"],
  ["CAT","Caterpillar Inc.","Industrials","NYSE"],
  ["QCOM","QUALCOMM Inc.","Technology","NASDAQ"],
  ["T","AT&T Inc.","Communication Services","NYSE"],
  ["LIN","Linde plc","Materials","NASDAQ"],
  ["NEE","NextEra Energy Inc.","Utilities","NYSE"],
  ["DIS","The Walt Disney Company","Communication Services","NYSE"],
  ["INTC","Intel Corporation","Technology","NASDAQ"],
  ["NKE","NIKE Inc.","Consumer Discretionary","NYSE"],
  ["PFE","Pfizer Inc.","Health Care","NYSE"],
  ["INTU","Intuit Inc.","Technology","NASDAQ"],
  ["UPS","United Parcel Service Inc.","Industrials","NYSE"],
  ["RTX","RTX Corporation","Industrials","NYSE"],
  ["GE","GE Aerospace","Industrials","NYSE"],
  ["MS","Morgan Stanley","Financials","NYSE"]
];

export async function fetchAVStocks(limit = 50, search = "") {
  const query = String(search || "").trim().toUpperCase();
  const requestedLimit = Math.min(Math.max(Number(limit) || 50, 1), BROAD_STOCK_UNIVERSE.length);
  let universe = BROAD_STOCK_UNIVERSE.filter(
    ([symbol, name]) => !query || symbol.includes(query) || name.toUpperCase().includes(query)
  );

  // TOP_GAINERS_LOSERS supplies many current quotes in one request. We merge
  // those values into the curated metadata fallback instead of spending one
  // free-tier request per ticker.
  let quoteMap = new Map();
  try {
    const movers = await fetchAVTopMovers();
    const quotes = [...movers.topGainers, ...movers.topLosers, ...movers.mostActive];
    quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
  } catch {
    // The metadata list remains usable while all prices show as unavailable.
  }

  universe = [...universe].sort((a, b) => Number(quoteMap.has(b[0])) - Number(quoteMap.has(a[0])));
  return universe.slice(0, requestedLimit).map(([symbol, name, sector, exchange]) => {
    const quote = quoteMap.get(symbol) || {};
    return {
      symbol,
      name,
      price: quote.price ?? null,
      change: quote.change ?? null,
      changePercent: quote.changePercent ?? null,
      open: quote.open ?? null,
      high: quote.high ?? null,
      low: quote.low ?? null,
      previousClose: quote.previousClose ?? null,
      volume: quote.volume ?? null,
      marketCap: null,
      sector,
      country: "US",
      currency: "USD",
      exchange,
      provider: quote.provider || "MetadataFallback"
    };
  });
}
