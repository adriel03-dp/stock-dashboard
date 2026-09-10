import axios from "axios";

const client = axios.create({ baseURL: "https://finnhub.io/api/v1", timeout: 15000 });
const universe = [
  ["AAPL", "Apple Inc."], ["MSFT", "Microsoft Corporation"], ["NVDA", "NVIDIA Corporation"],
  ["AMZN", "Amazon.com, Inc."], ["GOOGL", "Alphabet Inc."], ["META", "Meta Platforms, Inc."],
  ["TSLA", "Tesla, Inc."], ["AVGO", "Broadcom Inc."], ["AMD", "Advanced Micro Devices, Inc."],
  ["JPM", "JPMorgan Chase & Co."], ["V", "Visa Inc."], ["WMT", "Walmart Inc."]
];
const quoteCache = new Map();

function apiKey() {
  if (!process.env.FINNHUB_API_KEY) throw new Error("FINNHUB_API_KEY is not configured");
  return process.env.FINNHUB_API_KEY;
}

export async function fetchFinnhubQuote(symbol) {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.at < 45_000) return cached.value;
  const { data } = await client.get("/quote", { params: { symbol, token: apiKey() } });
  if (!data || data.c == null || data.c === 0) return null;
  const value = { symbol, price: Number(data.c), change: data.d == null ? null : Number(data.d), changePercent: data.dp == null ? null : Number(data.dp), open: data.o == null ? null : Number(data.o), high: data.h == null ? null : Number(data.h), low: data.l == null ? null : Number(data.l), previousClose: data.pc == null ? null : Number(data.pc), provider: "Finnhub" };
  quoteCache.set(symbol, { at: Date.now(), value });
  return value;
}

export async function fetchFinnhubStocks(limit = 20, search = "") {
  const query = String(search || "").trim().toUpperCase();
  const selected = universe.filter(([symbol, name]) => !query || symbol.includes(query) || name.toUpperCase().includes(query)).slice(0, Math.min(Math.max(limit, 1), universe.length));
  const values = await Promise.all(selected.map(async ([symbol, name]) => { try { const quote = await fetchFinnhubQuote(symbol); return quote ? { ...quote, name, currency: "USD", country: "US", sector: null, volume: null, marketCap: null } : null; } catch { return null; } }));
  return values.filter(Boolean);
}

export async function fetchFinnhubOverview() {
  const stocks = await fetchFinnhubStocks(universe.length);
  if (!stocks.length) throw new Error("Finnhub returned no quotes");
  const quoted = stocks.filter((item) => item.changePercent != null);
  return { highlights: { topGainers: [...quoted].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5), topLosers: [...quoted].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5), mostActive: stocks.slice(0, 5), topMarketCap: stocks.slice(0, 5) }, breadth: { total: quoted.length, advancing: quoted.filter((x) => x.changePercent > 0).length, declining: quoted.filter((x) => x.changePercent < 0).length, unchanged: quoted.filter((x) => x.changePercent === 0).length }, source: "Finnhub" };
}

export async function fetchFinnhubCrypto() {
  const symbols = ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT", "BINANCE:SOLUSDT"];
  const values = await Promise.all(symbols.map(async (symbol) => { try { const quote = await fetchFinnhubQuote(symbol); if (!quote) return null; const clean = symbol.split(":").pop().replace(/USDT$/, ""); return { ...quote, id: clean.toLowerCase(), symbol: clean, name: clean, current_price: quote.price, price_change_percentage_24h: quote.changePercent, total_volume: null, market_cap: null }; } catch { return null; } }));
  return values.filter(Boolean);
}
