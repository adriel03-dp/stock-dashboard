import axios from "axios";

const client = axios.create({
  baseURL: "https://api.coingecko.com/api/v3"
});

async function request(url, params = {}) {
  try {
    const { data } = await client.get(url, { params });
    return data;
  } catch (err) {
    const message = err.response?.data || err.message;
    console.error("CoinGecko error:", message);
    throw new Error(typeof message === "string" ? message : "CoinGecko request failed");
  }
}

async function fetchMarketById(id) {
  if (!id) return null;
  try {
    const data = await request("/coins/markets", {
      vs_currency: "usd",
      ids: id,
      per_page: 1,
      sparkline: true
    });
    return data?.[0] ?? null;
  } catch (err) {
    return null;
  }
}

export async function fetchTopCoins(limit = 20) {
  return request("/coins/markets", {
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: limit,
    page: 1,
    sparkline: true
  });
}

export async function fetchCoinMarket(identifier) {
  if (!identifier) return null;
  const normalized = identifier.toLowerCase();

  const direct = await fetchMarketById(normalized);
  if (direct) return direct;

  try {
    const search = await request("/search", { query: normalized });
    const match = search?.coins?.find((coin) => {
      if (!coin) return false;
      const symbol = coin.symbol?.toLowerCase();
      return coin.id === normalized || symbol === normalized || coin.name?.toLowerCase() === normalized;
    });
    if (!match) return null;
    return await fetchMarketById(match.id);
  } catch (err) {
    return null;
  }
}
