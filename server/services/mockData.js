// Mock data for development when API keys are not configured
import { getLogoUrls } from "./newsLogoService.js";

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
  const categoryMap = {
    markets: [
      "Fed signals possible rate cut in 2025",
      "Quarterly GDP growth exceeds expectations",
      "Merger boom returns to Wall Street",
      "Stock market hits all-time high"
    ],
    economy: [
      "Unemployment rate hits record low",
      "Inflation pressures ease slightly",
      "Consumer spending accelerates",
      "Trade deficit narrows unexpectedly"
    ],
    technology: [
      "Tech stocks rally on strong earnings",
      "Semiconductor shortage eases supply chain",
      "AI adoption accelerates across sectors",
      "Cloud computing demand remains strong"
    ],
    energy: [
      "Oil prices surge on geopolitical tensions",
      "Renewable energy investments hit record",
      "OPEC production cuts announced",
      "Natural gas prices stabilize"
    ],
    crypto: [
      "Crypto market rebounds after recent losses",
      "Bitcoin breaks above $50,000",
      "Ethereum upgrades boost performance",
      "Stablecoin regulations tighten"
    ]
  };

  const categoryImages = {
    markets: [
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1590283603974-d387221b747c?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-adf4e565e479?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=250&fit=crop"
    ],
    economy: [
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1579621970563-ebec5330b72f?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1608231387802-ba4f8c70ae0b?w=400&h=250&fit=crop"
    ],
    technology: [
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1518611505868-d2b6ba36af7e?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1551632786-de41eccebe9d?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=250&fit=crop"
    ],
    energy: [
      "https://images.unsplash.com/photo-1533794459197-aad4bbd112c4?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1508615039623-a25605d2938d?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1466611653033-a2037a8b8a3a?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1500375592092-40eb3daca4e7?w=400&h=250&fit=crop"
    ],
    crypto: [
      "https://images.unsplash.com/photo-1621761191319-c6fb62b338ad?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1605792657692-4e2489b18b5b?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1641896522149-d1edf94e0e9c?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1626289606316-7fcaaa0cfca0?w=400&h=250&fit=crop"
    ]
  };

  const sourceLogos = {
    "Bloomberg": getLogoUrls("Bloomberg"),
    "Reuters": getLogoUrls("Reuters"),
    "CNBC": getLogoUrls("CNBC"),
    "MarketWatch": getLogoUrls("MarketWatch"),
    "Seeking Alpha": getLogoUrls("Seeking Alpha"),
    "Investor's Business Daily": getLogoUrls("Investor's Business Daily")
  };

  const sources = Object.keys(sourceLogos);

  const newsUrls = [
    "https://www.cnbc.com/quotes/AAPL/",
    "https://www.reuters.com/technology/",
    "https://www.bloomberg.com/quote/MSFT:US",
    "https://www.marketwatch.com/story/",
    "https://www.nasdaq.com/articles/",
    "https://seekingalpha.com/news",
    "https://www.cnbc.com/markets/",
    "https://www.bloomberg.com/markets",
    "https://www.cnbc.com/economy/",
    "https://www.reuters.com/finance/"
  ];

  const categories = Object.keys(categoryMap);

  return Array.from({ length: count }, (_, i) => {
    const categoryIndex = i % categories.length;
    const category = categories[categoryIndex];
    const categoryTitles = categoryMap[category];
    const title = categoryTitles[i % categoryTitles.length];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const categoryImageList = categoryImages[category];
    const image = categoryImageList[i % categoryImageList.length];

    return {
      id: `news-${i}`,
      title: title,
      description: "Market participants are responding positively to the latest economic data releases. Analysts believe this could signal a shift in monetary policy direction for the coming quarters.",
      url: newsUrls[i % newsUrls.length],
      image: image,
      source: source,
      sourceLogo: sourceLogos[source],
      category: category,
      tickers: ["AAPL", "MSFT", "GOOGL"].slice(0, Math.floor(Math.random() * 3) + 1),
      publishedAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
    };
  });
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

