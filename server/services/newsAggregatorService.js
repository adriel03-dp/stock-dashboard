import axios from "axios";
import { generateMockNews } from "./mockData.js";

const newsAggregator = {
  /**
   * Fetch from Finnhub API (PRIMARY SOURCE - live data)
   */
  async fetchFromFinnhub(params = {}) {
    try {
      const finnhubKey = process.env.FINNHUB_API_KEY;
      if (!finnhubKey) {
        console.log("⚠️ Finnhub API key not configured");
        return [];
      }

      console.log("📡 Fetching from Finnhub API (PRIMARY)...");
      
      const response = await axios.get("https://finnhub.io/api/v1/news", {
        params: {
          token: finnhubKey,
          limit: params.limit || 50,
          minId: 0
        },
        timeout: 8000
      });

      const articles = Array.isArray(response.data) ? response.data : [];
      
      if (articles.length > 0) {
        console.log(`✅ Finnhub API returned ${articles.length} articles`);
        return articles.map(item => ({
          id: item.id || item.url || Math.random().toString(36),
          title: item.headline || "Untitled",
          description: item.summary || "",
          url: item.url || "",
          image: item.image || null,
          source: "Finnhub",
          sourceLogo: this.getLogoForSource("Finnhub"),
          publishedAt: item.datetime 
            ? new Date(item.datetime * 1000).toISOString()
            : new Date().toISOString(),
          tickers: item.related || [],
          category: this.categorizeNews(item.headline + " " + (item.summary || ""))
        }));
      }

      console.log("⚠️ Finnhub API returned no results");
      return [];
    } catch (err) {
      console.warn("❌ Finnhub API error:", err.message);
      return [];
    }
  },

  /**
   * Fetch from Polygon API (FALLBACK SOURCE - actually Massive API)
   * Note: Polygon news endpoint is part of Massive API (massive.com)
   */
  async fetchFromPolygon(params = {}) {
    try {
      const massiveKey = process.env.MASSIVE_API_KEY;
      if (!massiveKey) {
        console.log("⚠️ Massive API key not configured");
        return [];
      }

      console.log("📡 Fetching from Polygon/Massive API (FALLBACK)...");
      
      const response = await axios.get("https://api.massive.com/v1/news", {
        params: {
          apikey: massiveKey,
          limit: params.limit || 50,
          sort: "published_utc"
        },
        timeout: 8000,
        headers: {
          'Authorization': `Bearer ${massiveKey}`
        }
      });

      const results = response.data?.results || response.data?.data || [];
      
      if (results.length > 0) {
        console.log(`✅ Polygon/Massive API returned ${results.length} articles`);
        return results.map(item => ({
          id: item.id || item.article_url || item.url || Math.random().toString(36),
          title: item.title || item.headline || "Untitled",
          description: item.description || item.snippet || item.summary || "",
          url: item.article_url || item.url || item.link || "",
          image: item.image_url || item.image || null,
          source: item.source || "Massive",
          sourceLogo: this.getLogoForSource(item.source || "Massive"),
          publishedAt: item.published_utc || item.published_at || item.publishedAt || new Date().toISOString(),
          tickers: item.tickers || item.symbols || [],
          category: this.categorizeNews(item.title + " " + (item.description || item.summary || ""))
        }));
      }

      console.log("⚠️ Polygon/Massive API returned no results");
      return [];
    } catch (err) {
      console.warn("❌ Polygon/Massive API error:", err.message);
      return [];
    }
  },

  /**
   * Fetch from Massive API (FALLBACK SOURCE)
   * Attempts multiple possible endpoints for robustness
   */
  async fetchFromMassive(params = {}) {
    try {
      const massiveKey = process.env.MASSIVE_API_KEY;
      if (!massiveKey) {
        console.log("⚠️ Massive API key not configured");
        return [];
      }

      console.log("📡 Fetching from Massive API (FALLBACK)...");

      const response = await axios.get("https://api.massive.com/v1/news/top", {
        params: {
          apikey: massiveKey,
          limit: params.limit || 50,
          language: "en"
        },
        timeout: 8000,
        headers: {
          'Authorization': `Bearer ${massiveKey}`
        }
      });

      const news = response.data?.results || response.data?.data || response.data?.news || [];
      if (Array.isArray(news) && news.length > 0) {
        console.log(`✅ Massive API returned ${news.length} articles`);
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

      console.log("⚠️ Massive API returned no results");
      return [];
    } catch (err) {
      console.warn("❌ Massive API error:", err.message);
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
      "Finnhub": ["https://finnhub.io/favicon.ico", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%234A90E2' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='45' font-weight='bold' fill='white' text-anchor='middle'%3EFH%3C/text%3E%3C/svg%3E"],
      "Bloomberg": ["https://www.bloomberg.com/favicon.ico", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23FF6000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='70' font-weight='bold' fill='white' text-anchor='middle'%3EB%3C/text%3E%3C/svg%3E"],
      "Reuters": ["https://www.reuters.com/favicon.ico", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23FF6000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='45' font-weight='bold' fill='white' text-anchor='middle'%3ERUET%3C/text%3E%3C/svg%3E"],
      "CNBC": ["https://www.cnbc.com/favicon.ico", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23CC0000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='60' font-weight='bold' fill='white' text-anchor='middle'%3ECNBC%3C/text%3E%3C/svg%3E"],
      "MarketWatch": ["https://www.marketwatch.com/favicon.ico", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23003D7A' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='50' font-weight='bold' fill='white' text-anchor='middle'%3EMW%3C/text%3E%3C/svg%3E"],
      "Seeking Alpha": ["https://seekingalpha.com/favicon.ico", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%234A90E2' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='55' font-weight='bold' fill='white' text-anchor='middle'%3ESA%3C/text%3E%3C/svg%3E"],
      "Investor's Business Daily": ["https://investors.com/favicon.ico", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23000000' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='60' font-weight='bold' fill='white' text-anchor='middle'%3EIBD%3C/text%3E%3C/svg%3E"]
    };

    // Check for partial matches
    for (const [key, logos] of Object.entries(logoMap)) {
      if (source && source.toLowerCase().includes(key.toLowerCase())) {
        return logos;
      }
    }

    // Default fallback - generate initials from source name
    const initials = (source || "News")
      .split(/\s+/)
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);
    
    return [
      `https://${source?.toLowerCase().replace(/\s+/g, '')}.com/favicon.ico`,
      `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%234A90E2' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='45' font-weight='bold' fill='white' text-anchor='middle'%3E${initials}%3C/text%3E%3C/svg%3E`
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
   * Priority: Finnhub (live) -> Polygon (live) -> Massive (fallback)
   */
  async aggregateNews(options = {}) {
    const {
      limit = 50,
      category = undefined,
      search = undefined,
      symbols = undefined,
      includeMockData = true
    } = options;

    console.log("🔍 Aggregating news from multiple sources (priority: Finnhub > Polygon > Massive)...");

    // Fetch from sources in priority order
    const finnhubNews = await this.fetchFromFinnhub({ limit });
    console.log(`📰 Finnhub: ${finnhubNews.length} articles`);

    let combinedNews = [...finnhubNews];

    // If Finnhub didn't return enough, try Polygon
    if (combinedNews.length < limit) {
      const remainingLimit = limit - combinedNews.length;
      const polygonNews = await this.fetchFromPolygon({ limit: remainingLimit });
      console.log(`📰 Polygon: ${polygonNews.length} articles`);
      combinedNews = [...combinedNews, ...polygonNews];
    }

    // If still not enough, try Massive
    if (combinedNews.length < limit) {
      const remainingLimit = limit - combinedNews.length;
      const massiveNews = await this.fetchFromMassive({ limit: remainingLimit });
      console.log(`📰 Massive: ${massiveNews.length} articles`);
      combinedNews = [...combinedNews, ...massiveNews];
    }

    console.log(`📰 Total fetched ${combinedNews.length} articles from live APIs`);

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
