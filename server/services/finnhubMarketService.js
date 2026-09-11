import axios from "axios";

const client = axios.create({ baseURL: "https://finnhub.io/api/v1", timeout: 15000 });
const universe = [
  ["AAPL", "Apple Inc.", "Technology"], ["MSFT", "Microsoft Corporation", "Technology"], ["NVDA", "NVIDIA Corporation", "Technology"],
  ["AMZN", "Amazon.com, Inc.", "Consumer Discretionary"], ["GOOGL", "Alphabet Inc.", "Communication Services"], ["META", "Meta Platforms, Inc.", "Communication Services"],
  ["TSLA", "Tesla, Inc.", "Consumer Discretionary"], ["AVGO", "Broadcom Inc.", "Technology"], ["AMD", "Advanced Micro Devices, Inc.", "Technology"],
  ["JPM", "JPMorgan Chase & Co.", "Financials"], ["V", "Visa Inc.", "Financials"], ["WMT", "Walmart Inc.", "Consumer Staples"]
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
  if (!selected.length) return [];

  const settled = await Promise.allSettled(selected.map(async ([symbol, name, sector]) => {
    const quote = await fetchFinnhubQuote(symbol);
    return quote ? { ...quote, name, currency: "USD", country: "US", sector, volume: null, marketCap: null } : null;
  }));
  const values = settled.filter((result) => result.status === "fulfilled" && result.value).map((result) => result.value);
  if (!values.length) {
    const firstFailure = settled.find((result) => result.status === "rejected");
    throw new Error(firstFailure?.reason?.message || "Finnhub returned no quotes");
  }
  return values;
}

export async function fetchFinnhubOverview() {
  const stocks = await fetchFinnhubStocks(universe.length);
  if (!stocks.length) throw new Error("Finnhub returned no quotes");
  const quoted = stocks.filter((item) => item.changePercent != null);
  return { highlights: { topGainers: [...quoted].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5), topLosers: [...quoted].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5), mostActive: [], topMarketCap: [] }, breadth: { total: quoted.length, advancing: quoted.filter((x) => x.changePercent > 0).length, declining: quoted.filter((x) => x.changePercent < 0).length, unchanged: quoted.filter((x) => x.changePercent === 0).length }, source: "Finnhub" };
}

export async function fetchFinnhubSectors() {
  const stocks = await fetchFinnhubStocks(universe.length);
  const grouped = new Map();
  for (const stock of stocks) {
    const name = stock.sector || "Other";
    const group = grouped.get(name) || [];
    group.push(stock);
    grouped.set(name, group);
  }

  const sectors = [...grouped.entries()].map(([name, companies]) => {
    const quoted = companies.filter((company) => Number.isFinite(company.changePercent));
    const advancing = quoted.filter((company) => company.changePercent > 0).length;
    const declining = quoted.filter((company) => company.changePercent < 0).length;
    return {
      name,
      changePercent: quoted.length ? quoted.reduce((sum, company) => sum + company.changePercent, 0) / quoted.length : null,
      totalMarketCap: null,
      totalVolume: null,
      symbols: companies.length,
      advancers: advancing,
      decliners: declining,
      unchanged: companies.length - advancing - declining,
      topConstituents: companies.slice(0, 5),
      topMovers: {
        gainers: [...quoted].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3),
        losers: [...quoted].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3)
      }
    };
  });
  if (!sectors.length) throw new Error("Finnhub returned no sector quotes");
  return { sectors, source: "Finnhub" };
}

export async function fetchFinnhubCrypto() {
  const symbols = ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT", "BINANCE:SOLUSDT"];
  const values = await Promise.all(symbols.map(async (symbol) => { try { const quote = await fetchFinnhubQuote(symbol); if (!quote) return null; const clean = symbol.split(":").pop().replace(/USDT$/, ""); return { ...quote, id: clean.toLowerCase(), symbol: clean, name: clean, current_price: quote.price, price_change_percentage_24h: quote.changePercent, total_volume: null, market_cap: null }; } catch { return null; } }));
  const quoted = values.filter(Boolean);
  if (!quoted.length) throw new Error("Finnhub returned no crypto quotes");
  return quoted;
}
