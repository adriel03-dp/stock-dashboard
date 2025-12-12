// Mock data for development when API keys are not configured

export const generateMockStocks = (count = 100) => {
  const sectors = ["Technology", "Healthcare", "Finance", "Energy", "Consumer", "Industrial", "Materials", "Utilities"];
  const countries = ["US", "CA", "UK", "DE", "JP", "AU"];
  const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM", "V", "WMT", "BA", "XOM", "PFE", "JNJ", "DIS"];

  return Array.from({ length: count }, (_, i) => {
    const symbol = symbols[i % symbols.length] + (i > symbols.length ? i : "");
    const price = Math.random() * 500 + 10;
    const change = (Math.random() - 0.45) * 20;
    const changePercent = (change / price) * 100;

    return {
      id: symbol,
      symbol: symbol.toUpperCase(),
      name: `${symbol} Corporation`,
      price: price,
      change: change,
      changePercent: changePercent,
      previousClose: price - change,
      open: price + (Math.random() - 0.5) * 10,
      high: price + Math.abs(Math.random() * 10),
      low: price - Math.abs(Math.random() * 10),
      volume: Math.floor(Math.random() * 100000000),
      marketCap: Math.floor(Math.random() * 3000000000000),
      sector: sectors[Math.floor(Math.random() * sectors.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      currency: "USD",
      sparkline: Array.from({ length: 20 }, () => price + (Math.random() - 0.5) * 20)
    };
  });
};

export const generateMockMarketOverview = () => {
  const stocks = generateMockStocks(50);
  const gainers = stocks.sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
  const losers = stocks.sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
  const actives = stocks.sort((a, b) => b.volume - a.volume).slice(0, 5);

  const advancing = stocks.filter(s => s.changePercent > 0).length;
  const declining = stocks.filter(s => s.changePercent < 0).length;
  const unchanged = stocks.filter(s => s.changePercent === 0).length;

  return {
    marketStatus: {
      status: "open",
      market: "stocks"
    },
    highlights: {
      topGainers: gainers,
      topLosers: losers,
      mostActive: actives,
      topMarketCap: stocks.sort((a, b) => b.marketCap - a.marketCap).slice(0, 5)
    },
    breadth: {
      total: stocks.length,
      advancing,
      declining,
      unchanged,
      advancingPct: (advancing / stocks.length) * 100,
      decliningPct: (declining / stocks.length) * 100,
      unchangedPct: (unchanged / stocks.length) * 100
    }
  };
};

export const generateMockSectors = () => {
  const sectorNames = ["Technology", "Healthcare", "Finance", "Energy", "Consumer", "Industrial", "Materials", "Utilities"];
  const stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JNJ", "PFE", "UNH", "BA", "CAT", "XOM", "CVX", "PG", "KO", "WMT", "JPM", "BAC", "GS"];
  
  const generateStockData = () => {
    const price = Math.random() * 500 + 10;
    const change = (Math.random() - 0.45) * 20;
    return {
      changePercent: (change / price) * 100,
      price
    };
  };

  const sectors = sectorNames.map(name => {
    const changePercent = (Math.random() - 0.45) * 5;
    
    // Generate top constituents (by market cap)
    const topConstituents = stocks.slice(0, 5).map(symbol => {
      const data = generateStockData();
      return {
        symbol,
        name: `${symbol} Inc.`,
        marketCap: Math.floor(Math.random() * 500000000000),
        changePercent: data.changePercent
      };
    });

    // Generate top movers
    const allStocks = stocks.map(symbol => {
      const data = generateStockData();
      return {
        symbol,
        name: `${symbol} Inc.`,
        changePercent: data.changePercent
      };
    });

    const topMovers = {
      gainers: allStocks.sort((a, b) => b.changePercent - a.changePercent).slice(0, 3),
      losers: allStocks.sort((a, b) => a.changePercent - b.changePercent).slice(0, 3)
    };

    return {
      name,
      changePercent,
      totalMarketCap: Math.floor(Math.random() * 5000000000000),
      totalVolume: Math.floor(Math.random() * 500000000000),
      symbols: Math.floor(Math.random() * 100) + 20,
      advancers: Math.floor(Math.random() * 50) + 10,
      decliners: Math.floor(Math.random() * 50) + 5,
      unchanged: Math.floor(Math.random() * 20) + 2,
      topConstituents,
      topMovers
    };
  });

  return { sectors };
};

export const generateMockNews = (count = 20) => {
  const titles = [
    "Fed signals possible rate cut in 2025",
    "Tech stocks rally on strong earnings",
    "Oil prices surge on geopolitical tensions",
    "Healthcare sector shows resilience",
    "Banking crisis averted with emergency measures",
    "Quarterly GDP growth exceeds expectations",
    "Crypto market rebounds after recent losses",
    "Semiconductor shortage eases supply chain",
    "Merger boom returns to Wall Street",
    "Unemployment rate hits record low"
  ];

  const sources = ["Bloomberg", "Reuters", "CNBC", "MarketWatch", "Seeking Alpha", "Investor's Business Daily"];

  return Array.from({ length: count }, (_, i) => ({
    id: `news-${i}`,
    title: titles[i % titles.length],
    description: "Market participants are responding positively to the latest economic data releases. Analysts believe this could signal a shift in monetary policy direction for the coming quarters.",
    url: `https://example.com/news/${i}`,
    image: "https://via.placeholder.com/300x200?text=Market+News",
    source: sources[Math.floor(Math.random() * sources.length)],
    tickers: ["AAPL", "MSFT", "GOOGL"].slice(0, Math.floor(Math.random() * 3) + 1),
    publishedAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString()
  }));
};

export const generateMockStockDetail = (symbol = "AAPL") => {
  const price = Math.random() * 500 + 10;
  const change = (Math.random() - 0.45) * 20;
  const changePercent = (change / price) * 100;
  const historyData = Array.from({ length: 30 }, (_, i) => ({
    timestamp: Date.now() - (30 - i) * 24 * 60 * 60 * 1000,
    open: price + (Math.random() - 0.5) * 20,
    high: price + Math.random() * 15,
    low: price - Math.random() * 15,
    close: price + (Math.random() - 0.5) * 20,
    volume: Math.floor(Math.random() * 100000000)
  }));

  return {
    symbol: symbol.toUpperCase(),
    name: `${symbol} Corporation`,
    currency: "USD",
    exchange: "NASDAQ",
    summary: {
      symbol: symbol.toUpperCase(),
      name: `${symbol} Corporation`,
      price: price,
      change: change,
      changePercent: changePercent,
      currency: "USD",
      lastUpdated: new Date().toISOString()
    },
    metrics: {
      open: price + (Math.random() - 0.5) * 10,
      previousClose: price - change,
      high: price + Math.random() * 15,
      low: price - Math.random() * 15,
      week52High: price + 100,
      week52Low: price - 50,
      volume: Math.floor(Math.random() * 100000000),
      avgVolume: Math.floor(Math.random() * 80000000),
      marketCap: Math.floor(Math.random() * 3000000000000),
      peRatio: (Math.random() * 30 + 10).toFixed(2),
      eps: (Math.random() * 10 + 2).toFixed(2),
      dividendYield: (Math.random() * 3).toFixed(2)
    },
    profile: {
      description: "A leading multinational technology company focused on innovation and digital transformation.",
      sector: "Technology",
      industry: "Software",
      ceo: "John Smith",
      employees: Math.floor(Math.random() * 100000) + 10000
    },
    indicators: {
      ema50: price + (Math.random() - 0.5) * 5,
      ema200: price + (Math.random() - 0.5) * 10,
      rsi: Math.random() * 100,
      macd: {
        macd: Math.random() * 2 - 1,
        signal: Math.random() * 2 - 1,
        histogram: Math.random() * 2 - 1
      }
    },
    history: {
      "1D": historyData,
      "5D": historyData,
      "1M": historyData,
      "3M": historyData,
      "6M": historyData,
      "1Y": historyData,
      "5Y": historyData,
      MAX: historyData
    },
    dividends: [],
    related: [],
    events: []
  };
};

export const generateMockTopCoins = (count = 12) => {
  const cryptoData = [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin", price: 42500, change24h: 2.5, marketCap: 850e9, volume24h: 45e9 },
    { id: "ethereum", symbol: "eth", name: "Ethereum", price: 2200, change24h: 1.8, marketCap: 265e9, volume24h: 18e9 },
    { id: "binancecoin", symbol: "bnb", name: "Binance Coin", price: 315, change24h: 1.2, marketCap: 48e9, volume24h: 2.1e9 },
    { id: "solana", symbol: "sol", name: "Solana", price: 165, change24h: 3.2, marketCap: 58e9, volume24h: 1.8e9 },
    { id: "cardano", symbol: "ada", name: "Cardano", price: 0.95, change24h: -0.5, marketCap: 34e9, volume24h: 750e6 },
    { id: "polkadot", symbol: "dot", name: "Polkadot", price: 7.8, change24h: 1.1, marketCap: 10.5e9, volume24h: 320e6 },
    { id: "ripple", symbol: "xrp", name: "XRP", price: 2.45, change24h: 0.8, marketCap: 130e9, volume24h: 2.5e9 },
    { id: "litecoin", symbol: "ltc", name: "Litecoin", price: 185, change24h: 2.3, marketCap: 24e9, volume24h: 920e6 },
    { id: "dogecoin", symbol: "doge", name: "Dogecoin", price: 0.28, change24h: 1.5, marketCap: 40e9, volume24h: 4.2e9 },
    { id: "avalanche-2", symbol: "avax", name: "Avalanche", price: 32, change24h: 2.1, marketCap: 11e9, volume24h: 380e6 },
    { id: "polygon", symbol: "matic", name: "Polygon", price: 0.95, change24h: 1.9, marketCap: 9.2e9, volume24h: 680e6 },
    { id: "chainlink", symbol: "link", name: "Chainlink", price: 23.5, change24h: 0.6, marketCap: 11.5e9, volume24h: 520e6 }
  ];

  return cryptoData.slice(0, count).map(coin => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    current_price: coin.price,
    price_change_percentage_24h: coin.change24h,
    market_cap: coin.marketCap,
    total_volume: coin.volume24h,
    image: `https://assets.coingecko.com/coins/images/1/${coin.id}.png`,
    sparkline_in_7d: {
      price: Array.from({ length: 7 }, () => coin.price + (Math.random() - 0.5) * coin.price * 0.1)
    }
  }));
};

