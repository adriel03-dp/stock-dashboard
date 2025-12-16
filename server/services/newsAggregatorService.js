import axios from "axios";
import { generateMockNews } from "./mockData.js";

const newsAggregator = {
  /**
   * Fetch from Massive API (primary source)
   * Attempts multiple possible endpoints for robustness
   */
  async fetchFromMassive(params = {}) {
    try {
      const massiveKey = process.env.MASSIVE_API_KEY;
      if (!massiveKey) {
        console.log("⚠️ Massive API key not configured");
        return [];
      }

      // Try multiple possible endpoints based on Massive API docs
      const endpoints = [
        // New pattern endpoints
        "https://api.massive.com/news",
        "https://api.massive.com/v2/news",
        "https://api.massive.com/api/news",
        // Original patterns
        "https://api.massive.com/v3/news",
        "https://api.massive.com/v1/news",
        // Alternative domains
        "https://news.massive.com/api/news",
        "https://news.api.massive.com",
        "https://data.massive.com/news"
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`📡 Trying Massive API: ${endpoint}`);
          const response = await axios.get(endpoint, {
            params: {
              apiKey: massiveKey,
              key: massiveKey,
              api_key: massiveKey,
              token: massiveKey,
              limit: params.limit || 50,
              ...params
            },
            timeout: 5000,
            headers: {
              'Authorization': `Bearer ${massiveKey}`,
              'X-API-Key': massiveKey
            }
          });

          const news = response.data?.results || response.data?.data || response.data?.news || response.data || [];
          if (Array.isArray(news) && news.length > 0) {
            console.log(`✅ Massive API returned ${news.length} articles from ${endpoint}`);
            return news.map(item => ({
              id: item.id || item.url || Math.random().toString(36),
              title: item.title || item.headline || "Untitled",
              description: item.description || item.summary || item.content || "",
              url: item.url || item.link || "",
              image: item.image_url || item.image || item.imageUrl || "",
              source: item.source || "Massive",
              sourceLogo: this.getLogoForSource(item.source || "Massive"),
              publishedAt: item.published_utc || item.published_at || item.publishedAt || item.published || new Date().toISOString(),
              tickers: item.tickers || item.symbols || item.ticker || [],
              category: this.categorizeNews(item.title + " " + (item.description || item.summary || item.content || ""))
            }));
          }
        } catch (endpointErr) {
          // Log and try next endpoint
          if (endpointErr.response?.status !== 404) {
            console.log(`⚠️ ${endpoint}: ${endpointErr.message}`);
          }
          continue;
        }
      }

      console.log("⚠️ Massive API: Could not fetch from any endpoint (falling back to mock data)");
      return [];
    } catch (err) {
      console.warn("Massive API error:", err.message);
      return [];
    }
  },

  /**
   * Fetch from FMP API (secondary source)
   */
  async fetchFromFMP(params = {}) {
    // FMP API not configured - skip
    return [];
  },

  /**
   * Fetch from NewsAPI (free tier available)
   */
  async fetchFromNewsAPI(params = {}) {
    // NewsAPI not configured - skip
    return [];
  },

  /**
   * Fetch from Finnhub (market news)
   */
  async fetchFromFinnhub(params = {}) {
    // Finnhub not configured - skip
    return [];
  },

  /**
   * Extract ticker symbols from text
   */
  extractTickersFromText(text) {
    const tickerRegex = /\b([A-Z]{1,5})\b/g;
    const matches = text.match(tickerRegex) || [];
    // Filter common words
    const commonWords = new Set(["AND", "THE", "FOR", "THAT", "WITH", "FROM", "YOUR", "MORE", "HAVE", "THIS", "WILL", "ARE", "NOT", "BUT", "ABOUT", "GET", "CAN", "ITS", "STOCK", "NEWS", "MARKET", "SHARE"]);
    return Array.from(new Set(matches.filter(m => !commonWords.has(m)))).slice(0, 3);
  },

  /**
   * Categorize news based on content
   */
  categorizeNews(text) {
    const lower = text.toLowerCase();
    
    if (lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("ethereum")) {
      return "crypto";
    }
    if (lower.includes("energy") || lower.includes("oil") || lower.includes("gas") || lower.includes("renewable")) {
      return "energy";
    }
    if (lower.includes("tech") || lower.includes("software") || lower.includes("ai") || lower.includes("tech")) {
      return "technology";
    }
    if (lower.includes("economy") || lower.includes("gdp") || lower.includes("inflation") || lower.includes("interest") || lower.includes("fed")) {
      return "economy";
    }
    if (lower.includes("earnings") || lower.includes("revenue") || lower.includes("profit")) {
      return "markets";
    }
    
    return "markets"; // Default category
  },

  /**
   * Get logo URL for news source
   */
  getLogoForSource(source) {
    const logoMap = {
      "Bloomberg": ["https://logo.clearbit.com/bloomberg.com", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23FF6000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='70' font-weight='bold' fill='white' text-anchor='middle'%3EB%3C/text%3E%3C/svg%3E"],
      "Reuters": ["https://logo.clearbit.com/reuters.com", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23FF6000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='45' font-weight='bold' fill='white' text-anchor='middle'%3ERUET%3C/text%3E%3C/svg%3E"],
      "CNBC": ["https://logo.clearbit.com/cnbc.com", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23CC0000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='60' font-weight='bold' fill='white' text-anchor='middle'%3ECNBC%3C/text%3E%3C/svg%3E"],
      "MarketWatch": ["https://logo.clearbit.com/marketwatch.com", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23003D7A' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='50' font-weight='bold' fill='white' text-anchor='middle'%3EMW%3C/text%3E%3C/svg%3E"],
      "Seeking Alpha": ["https://logo.clearbit.com/seekingalpha.com", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%234A90E2' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='55' font-weight='bold' fill='white' text-anchor='middle'%3ESA%3C/text%3E%3C/svg%3E"],
      "Investor's Business Daily": ["https://logo.clearbit.com/investors.com", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23000000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='60' font-weight='bold' fill='white' text-anchor='middle'%3EIBD%3C/text%3E%3C/svg%3E"]
    };

    // Check for partial matches
    for (const [key, logos] of Object.entries(logoMap)) {
      if (source && source.toLowerCase().includes(key.toLowerCase())) {
        return logos;
      }
    }

    // Default fallback
    return [
      `https://logo.clearbit.com/${source?.toLowerCase().replace(/\s+/g, '')}.com`,
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%234A90E2' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='45' font-weight='bold' fill='white' text-anchor='middle'%3E%3C/text%3E%3C/svg%3E"
    ];
  },

  /**
   * Deduplicate news by URL
   */
  deduplicateNews(newsArray) {
    const seen = new Set();
    const deduped = [];

    for (const item of newsArray) {
      const key = item.url || item.title;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    return deduped;
  },

  /**
   * Sort news by date (newest first)
   */
  sortByDate(newsArray) {
    return newsArray.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });
  },

  /**
   * Filter news by category
   */
  filterByCategory(newsArray, category) {
    if (!category || category === "all") return newsArray;
    return newsArray.filter(item => item.category === category);
  },

  /**
   * Filter news by search query
   */
  filterBySearch(newsArray, search) {
    if (!search) return newsArray;
    const query = search.toLowerCase();
    return newsArray.filter(item =>
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  },

  /**
   * Filter news by symbols/tickers
   */
  filterBySymbols(newsArray, symbols) {
    if (!symbols) return newsArray;
    const symbolSet = new Set(symbols.split(",").map(s => s.toUpperCase().trim()));
    return newsArray.filter(item =>
      item.tickers && item.tickers.some(ticker => symbolSet.has(ticker.toUpperCase()))
    );
  },

  /**
   * Main aggregation method - fetch from multiple sources
   */
  async aggregateNews(options = {}) {
    const {
      limit = 50,
      category = undefined,
      search = undefined,
      symbols = undefined,
      includeMockData = true
    } = options;

    console.log("🔍 Aggregating news from multiple sources...");

    // Fetch from all sources in parallel
    const [massiveNews, fmpNews, newsApiNews, finnhubNews] = await Promise.all([
      this.fetchFromMassive({ limit }),
      this.fetchFromFMP({ limit }),
      this.fetchFromNewsAPI({ limit }),
      this.fetchFromFinnhub({ limit })
    ]);

    // Combine all news
    let combinedNews = [
      ...massiveNews,
      ...fmpNews,
      ...newsApiNews,
      ...finnhubNews
    ];

    console.log(`📰 Fetched ${combinedNews.length} articles from APIs`);

    // If not enough articles, add mock data
    if (includeMockData && combinedNews.length < limit) {
      const mockNews = generateMockNews(limit - combinedNews.length);
      combinedNews = [...combinedNews, ...mockNews];
      console.log(`✅ Added ${mockNews.length} mock articles for padding`);
    }

    // Deduplicate and sort
    combinedNews = this.deduplicateNews(combinedNews);
    combinedNews = this.sortByDate(combinedNews);
    console.log(`✨ Deduped to ${combinedNews.length} unique articles`);

    // Apply filters
    if (category) {
      combinedNews = this.filterByCategory(combinedNews, category);
    }
    if (search) {
      combinedNews = this.filterBySearch(combinedNews, search);
    }
    if (symbols) {
      combinedNews = this.filterBySymbols(combinedNews, symbols);
    }

    // Return requested limit
    return combinedNews.slice(0, limit);
  }
};

export default newsAggregator;
