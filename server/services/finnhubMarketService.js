import axios from "axios";

const client = axios.create({ baseURL: "https://finnhub.io/api/v1", timeout: 15000 });
const universe = [
  ["AAPL", "Apple Inc."], ["MSFT", "Microsoft Corporation"], ["NVDA", "NVIDIA Corporation"],
  ["AMZN", "Amazon.com, Inc."], ["GOOGL", "Alphabet Inc."], ["META", "Meta Platforms, Inc."],
  ["TSLA", "Tesla, Inc."], ["AVGO", "Broadcom Inc."], ["AMD", "Advanced Micro Devices, Inc."],
  ["JPM", "JPMorgan Chase & Co."], ["V", "Visa Inc."], ["WMT", "Walmart Inc."]
];
const quoteCache = new Map();
const pendingQuotes = new Map();
const FRESH_TTL_MS = 60_000;
const STALE_TTL_MS = 45 * 60_000;
const sectors = { AAPL: "Technology", MSFT: "Technology", NVDA: "Technology", AMZN: "Consumer Discretionary", GOOGL: "Communication Services", META: "Communication Services", TSLA: "Consumer Discretionary", AVGO: "Technology", AMD: "Technology", JPM: "Financials", V: "Financials", WMT: "Consumer Staples" };

function apiKey() {
  if (!process.env.FINNHUB_API_KEY) throw new Error("FINNHUB_API_KEY is not configured");
  return process.env.FINNHUB_API_KEY;
}

export async function fetchFinnhubQuote(symbol) {
  symbol = String(symbol).trim().toUpperCase();
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.at < FRESH_TTL_MS) return cached.value;
  if (pendingQuotes.has(symbol)) return pendingQuotes.get(symbol);
  const request = (async () => {
  try {
  const { data } = await client.get("/quote", { params: { symbol, token: apiKey().trim() } });
  if (!data || !Number.isFinite(Number(data.c)) || Number(data.c) <= 0) throw new Error("Finnhub returned no usable quote");
  const value = { symbol, price: Number(data.c), change: data.d == null ? null : Number(data.d), changePercent: data.dp == null ? null : Number(data.dp), open: data.o == null ? null : Number(data.o), high: data.h == null ? null : Number(data.h), low: data.l == null ? null : Number(data.l), previousClose: data.pc == null ? null : Number(data.pc), provider: "Finnhub" };
  quoteCache.set(symbol, { at: Date.now(), value });
  return value;
  } catch (error) {
    if (cached && Date.now() - cached.at <= STALE_TTL_MS) return { ...cached.value, isStale: true };
    // Avoid logging Axios request configuration, which contains the API key.
    console.warn(`Finnhub quote unavailable for ${symbol}: ${error.response?.status || error.code || 'NO_QUOTE'}`);
    throw new Error("Finnhub quote unavailable");
  } finally {
    pendingQuotes.delete(symbol);
  }
  })();
  pendingQuotes.set(symbol, request);
  return request;
}

export async function fetchFinnhubStocks(limit = 20, search = "") {
  const query = String(search || "").trim().toUpperCase();
  const selected = universe.filter(([symbol, name]) => !query || symbol.includes(query) || name.toUpperCase().includes(query)).slice(0, Math.min(Math.max(limit, 1), universe.length));
  const values = await Promise.all(selected.map(async ([symbol, name]) => { try { const quote = await fetchFinnhubQuote(symbol); return quote ? { ...quote, name, currency: "USD", country: "US", sector: null, volume: null, marketCap: null } : null; } catch { return null; } }));
  const results = values.filter(Boolean);
  if (selected.length && !results.length) throw new Error("Finnhub returned no quotes");
  return results;
}

export async function fetchFinnhubOverview() {
  const stocks = await fetchFinnhubStocks(universe.length);
  if (!stocks.length) throw new Error("Finnhub returned no quotes");
  const quoted = stocks.filter((item) => item.changePercent != null);
  return { highlights: { topGainers: [...quoted].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5), topLosers: [...quoted].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5), mostActive: [], topMarketCap: [] }, breadth: { total: quoted.length, advancing: quoted.filter((x) => x.changePercent > 0).length, declining: quoted.filter((x) => x.changePercent < 0).length, unchanged: quoted.filter((x) => x.changePercent === 0).length }, source: "Finnhub" };
}

export async function fetchFinnhubCrypto() {
  const symbols = ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT", "BINANCE:SOLUSDT"];
  const values = await Promise.all(symbols.map(async (symbol) => { try { const quote = await fetchFinnhubQuote(symbol); if (!quote) return null; const clean = symbol.split(":").pop().replace(/USDT$/, ""); return { ...quote, id: clean.toLowerCase(), symbol: clean, name: clean, current_price: quote.price, price_change_percentage_24h: quote.changePercent, total_volume: null, market_cap: null }; } catch { return null; } }));
  const results = values.filter(Boolean);
  if (!results.length) throw new Error("Finnhub returned no crypto quotes");
  return results;
}

export async function fetchFinnhubSectors() {
  const stocks = await fetchFinnhubStocks(universe.length);
  const grouped = new Map();
  for (const stock of stocks) {
    const name = sectors[stock.symbol] || "Other";
    const group = grouped.get(name) || [];
    group.push(stock);
    grouped.set(name, group);
  }
  return {
    sectors: [...grouped.entries()].map(([name, companies]) => {
      const changes = companies.map((item) => item.changePercent).filter(Number.isFinite);
      return {
        name,
        changePercent: changes.length ? changes.reduce((sum, value) => sum + value, 0) / changes.length : null,
        symbols: companies.length,
        totalMarketCap: null,
        totalVolume: null,
        topConstituents: companies.slice(0, 5),
        topMovers: {
          gainers: [...companies].filter((item) => Number.isFinite(item.changePercent)).sort((a, b) => b.changePercent - a.changePercent).slice(0, 3),
          losers: [...companies].filter((item) => Number.isFinite(item.changePercent)).sort((a, b) => a.changePercent - b.changePercent).slice(0, 3)
        }
      };
    }),
    source: "Finnhub"
  };
}
