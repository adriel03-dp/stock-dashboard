import axios from "axios";

const client = axios.create({ baseURL: "https://api.exchange.coinbase.com", timeout: 10000 });
const cache = new Map();
const pending = new Map();
const symbols = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "LINK", "AVAX", "LTC"];

export async function fetchCoinbaseCoin(identifier) {
  const aliases = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL" };
  const symbol = aliases[String(identifier).toLowerCase()] || String(identifier).toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(symbol)) throw new Error("Invalid coin symbol");
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  if (pending.has(symbol)) return pending.get(symbol);
  const request = (async () => {
    try {
      const { data } = await client.get(`/products/${symbol}-USD/stats`);
      const price = Number(data.last);
      const open = Number(data.open);
      if (!Number.isFinite(price) || price <= 0) throw new Error("No crypto quote available");
      const value = {
        id: symbol.toLowerCase(), symbol, name: symbol, current_price: price,
        price_change_percentage_24h: open > 0 ? (price - open) / open * 100 : null,
        market_cap: null, total_volume: null, base_volume: Number(data.volume),
        currency: "USD", provider: "Coinbase", image: null,
        sparkline_in_7d: { price: [] }, isStale: false
      };
      cache.set(symbol, { at: Date.now(), value });
      return value;
    } catch {
      if (cached && Date.now() - cached.at <= 45 * 60_000) return { ...cached.value, isStale: true };
      throw new Error("Crypto quote unavailable");
    } finally { pending.delete(symbol); }
  })();
  pending.set(symbol, request);
  return request;
}

export async function fetchCoinbaseCoins(limit = 9) {
  const values = [];
  // Sequential requests keep a cache refresh within the public API's rate limit.
  for (const symbol of symbols.slice(0, Math.min(Math.max(limit, 1), symbols.length))) {
    try { values.push(await fetchCoinbaseCoin(symbol)); } catch { /* partial results are useful */ }
  }
  if (!values.length) throw new Error("Crypto data unavailable");
  return values;
}
