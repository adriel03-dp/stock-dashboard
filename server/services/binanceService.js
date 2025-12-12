import axios from "axios";

const binanceClient = axios.create({
  baseURL: "https://api.binance.com/api/v3",
  timeout: 10000
});

async function request(url, params = {}) {
  try {
    const { data } = await binanceClient.get(url, { params });
    return data;
  } catch (err) {
    const message = err.response?.data?.msg || err.message;
    console.error("Binance API error:", message);
    throw new Error(typeof message === "string" ? message : "Binance request failed");
  }
}

// Get top cryptocurrencies by market cap
export async function fetchTopCoins(limit = 20) {
  try {
    // Get top coins by volume from Binance
    const data = await request("/ticker/24hr", {
      symbols: JSON.stringify([
        '"BTCUSDT"', '"ETHUSDT"', '"BNBUSDT"', '"XRPUSDT"', '"SOLUSDT"',
        '"ADAUSDT"', '"DOGEUSDT"', '"DOTUSDT"', '"LINKUSDT"', '"AVAXUSDT"',
        '"MATICUSDT"', '"LTCUSDT"', '"UNIUSDT"', '"ATOMUSDT"', '"XLMUSDT"',
        '"VETUDT"', '"FILUSDT"', '"SANDUSDT"', '"MANAUSDT"', '"APTUSDT"'
      ])
    });

    return Array.isArray(data) ? data.slice(0, limit).map(coin => ({
      id: coin.symbol.toLowerCase().replace('usdt', ''),
      symbol: coin.symbol.replace('USDT', ''),
      name: coin.symbol.replace('USDT', ''),
      current_price: parseFloat(coin.lastPrice),
      price_change_percentage_24h: parseFloat(coin.priceChangePercent),
      market_cap: null, // Binance doesn't provide market cap
      total_volume: parseFloat(coin.quoteAssetVolume),
      image: null,
      sparkline_in_7d: { price: [] }
    })) : [];
  } catch (err) {
    console.error("Failed to fetch top coins:", err.message);
    throw err;
  }
}

// Get specific coin market data
export async function fetchCoinMarket(identifier) {
  if (!identifier) return null;

  try {
    const symbol = identifier.toUpperCase();
    const coinSymbol = symbol === 'BTC' ? 'BTCUSDT' : 
                       symbol === 'ETH' ? 'ETHUSDT' :
                       symbol === 'SOL' ? 'SOLUSDT' :
                       symbol === 'ADA' ? 'ADAUSDT' :
                       symbol === 'XRP' ? 'XRPUSDT' :
                       symbol === 'DOT' ? 'DOTUSDT' :
                       symbol === 'DOGE' ? 'DOGEUSDT' :
                       symbol === 'LINK' ? 'LINKUSDT' :
                       symbol === 'AVAX' ? 'AVAXUSDT' :
                       symbol === 'MATIC' ? 'MATICUSDT' :
                       symbol + 'USDT';

    const data = await request("/ticker/24hr", {
      symbol: coinSymbol
    });

    if (!data) return null;

    return {
      id: data.symbol.toLowerCase().replace('usdt', ''),
      symbol: data.symbol.replace('USDT', ''),
      name: data.symbol.replace('USDT', ''),
      current_price: parseFloat(data.lastPrice),
      price_change_percentage_24h: parseFloat(data.priceChangePercent),
      market_cap: null,
      total_volume: parseFloat(data.quoteAssetVolume),
      image: null,
      sparkline_in_7d: { price: [] }
    };
  } catch (err) {
    console.error("Failed to fetch coin market:", err.message);
    return null;
  }
}
