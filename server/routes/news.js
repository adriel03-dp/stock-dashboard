import express from "express";
import axios from "axios";
import { massiveService } from "../services/massiveService.js";
import { generateMockNews } from "../services/mockData.js";
import newsAggregator from "../services/newsAggregatorService.js";
import newsStreamingService from "../services/newsStreamingService.js";
import FinnhubNewsService from "../services/finnhubNewsService.js";

const router = express.Router();

// Finnhub cache to avoid rate limiting
let finnhubCache = {
  articles: [],
  lastFetch: 0,
  fetching: false
};
const FINNHUB_CACHE_TTL = 60000; // 1 minute cache

// Initialize Finnhub service
let finnhubService = null;
function getFinnhubService() {
  if (!finnhubService) {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ FINNHUB_API_KEY not set in environment");
      return null;
    }
    finnhubService = new FinnhubNewsService(apiKey);
  }
  return finnhubService;
}

function extractNewsList(payload) {
  const list = payload?.results || payload?.data || payload?.items || payload?.news || payload?.articles || [];
  return Array.isArray(list) ? list : [];
}

function normalizeNewsItem(item) {
  if (!item || typeof item !== "object") return null;
  const publishedRaw = item.published_at || item.publishedAt || item.published || item.date || item.time || null;
  let publishedAt = null;
  if (publishedRaw) {
    const date = new Date(publishedRaw);
    publishedAt = Number.isNaN(date.getTime()) ? String(publishedRaw) : date.toISOString();
  }

  return {
    id: item.id || item.article_id || item.uuid || item.url || null,
    title: item.title || item.headline || item.name || "Untitled",
    description: item.description || item.summary || item.snippet || "",
    url: item.url || item.article_url || item.link || null,
    image: item.image_url || item.image || item.thumbnail || null,
    tickers: item.tickers || item.symbols || item.related_tickers || [],
    source: item.source || item.source_name || item.sourceName || null,
    category: item.category || item.topic || null,
    publishedAt
  };
}

/**
 * Determine article category based on content
 */
function categorizeArticle(title, description) {
  const content = (title + " " + description).toLowerCase();
  
  // Category keywords
  const categories = {
    crypto: ["bitcoin", "ethereum", "crypto", "blockchain", "btc", "eth", "nft", "defi", "token", "coin", "dogecoin", "ripple"],
    energy: ["energy", "oil", "gas", "renewable", "solar", "wind", "nuclear", "petroleum", "electricity", "power", "exxon", "chevron"],
    technology: ["tech", "ai", "software", "apple", "google", "microsoft", "meta", "nvidia", "computer", "digital", "cloud", "data"],
    economy: ["economy", "inflation", "gdp", "recession", "unemployment", "fed", "interest rate", "dollar", "treasury", "fiscal", "tax"],
    markets: ["market", "stock", "equity", "trading", "nasdaq", "dow", "s&p", "earnings", "dividend", "investment", "portfolio", "rally"]
  };
  
  // Check each category
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      return category;
    }
  }
  
  // Default to markets
  return "markets";
}

/**
 * Fetch Finnhub articles with caching to avoid rate limits
 */
async function fetchFinnhubWithCache(apiKey) {
  const now = Date.now();
  
  // Return cached data if still valid
  if (finnhubCache.articles.length > 0 && (now - finnhubCache.lastFetch) < FINNHUB_CACHE_TTL) {
    console.log(`✅ Returning cached Finnhub articles (${finnhubCache.articles.length})`);
    return finnhubCache.articles;
  }
  
  // If already fetching, wait a bit and return current cache
  if (finnhubCache.fetching) {
    console.log(`⏳ Finnhub fetch in progress, returning cached articles`);
    return finnhubCache.articles;
  }
  
  // Fetch from Finnhub API
  finnhubCache.fetching = true;
  try {
    console.log(`📡 Fetching fresh articles from Finnhub API...`);
    const response = await axios.get("https://finnhub.io/api/v1/news", {
      params: {
        token: apiKey,
        limit: 50,
        minId: 0
      },
      timeout: 5000
    });
    
    const articles = Array.isArray(response.data) ? response.data : [];
    if (articles.length > 0) {
      // Transform Finnhub data
      const transformedArticles = articles.filter(item => item.headline && item.url).map(item => ({
        id: item.id || item.url || Math.random().toString(36),
        title: item.headline || "Untitled",
        description: item.summary || "",
        url: item.url || "",
        image: item.image || null,
        source: "Finnhub",
        sourceLogo: [
          "https://finnhub.io/favicon.ico",
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%234A90E2' width='100' height='100'/%3E%3Ctext x='50' y='65' font-size='45' font-weight='bold' fill='white' text-anchor='middle'%3EFH%3C/text%3E%3C/svg%3E"
        ],
        publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString(),
        tickers: item.related || [],
        related: item.related || [],
        category: categorizeArticle(item.headline || "", item.summary || "")
      }));
      
      finnhubCache.articles = transformedArticles;
      finnhubCache.lastFetch = now;
      console.log(`✅ Cached ${transformedArticles.length} fresh articles from Finnhub`);
      return transformedArticles;
    }
  } catch (err) {
    console.error(`❌ Finnhub fetch error (${err.response?.status || err.code}):`, err.message);
    // Return cached articles even if stale
    if (finnhubCache.articles.length > 0) {
      console.log(`⚠️ Using stale cache (${finnhubCache.articles.length} articles)`);
      return finnhubCache.articles;
    }
  } finally {
    finnhubCache.fetching = false;
  }
  
  return [];
}

async function fetchLegacyTopNews({ limit, category, symbols, search, language, key }) {
  const url = "https://api.massive.com/v1/news/top";
  const params = { limit, language };
  if (category) params.category = category;
  if (symbols) params.symbols = symbols;
  if (search) params.search = search;

  const fetchWithAuth = async (headers) => {
    const { data } = await axios.get(url, { headers, params });
    return data;
  };

  try {
    return await fetchWithAuth({ Authorization: `Bearer ${key}` });
  } catch (err) {
    if (err?.response?.status !== 401) throw err;
    try {
      return await fetchWithAuth(undefined);
    } catch (nestedErr) {
      const fallbackParams = { ...params, apikey: key };
      const { data } = await axios.get(url, { params: fallbackParams });
      return data;
    }
  }
}

router.get("/top", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
    const category = req.query.category && req.query.category !== "all" ? req.query.category : undefined;
    const search = req.query.search || undefined;
    const symbols = req.query.symbols || req.query.symbol || undefined;

    // Use the news aggregator to fetch from multiple sources
    let news = await newsAggregator.aggregateNews({
      limit: limit * 1.5, // Fetch more to ensure after filtering we have enough
      category,
      search,
      symbols,
      includeMockData: true
    });

    // Filter for stock and crypto related news
    news = news.filter(item => {
      if (!item) return false;
      
      // Check if related to stocks or crypto
      const title = (item.title || "").toLowerCase();
      const description = (item.description || "").toLowerCase();
      const content = title + " " + description;
      
      // Stock keywords
      const stockKeywords = ["stock", "equity", "market", "trading", "nasdaq", "dow", "s&p", "earnings", "dividend", "investment", "portfolio", "shares"];
      // Crypto keywords
      const cryptoKeywords = ["bitcoin", "ethereum", "crypto", "blockchain", "btc", "eth", "nft", "defi", "token", "coin", "digital asset"];
      // Exclude keywords
      const excludeKeywords = ["weather", "sports", "celebrity", "entertainment", "movie", "actor", "actress"];
      
      // Check exclude keywords first
      if (excludeKeywords.some(keyword => content.includes(keyword))) {
        return false;
      }
      
      // Must contain stock or crypto keywords, or have relevant tickers
      const hasStockCryptoKeywords = [...stockKeywords, ...cryptoKeywords].some(keyword => content.includes(keyword));
      const hasTickers = item.tickers && item.tickers.length > 0;
      
      return hasStockCryptoKeywords || hasTickers;
    });

    // Sort by date (newest first)
    news = news.sort((a, b) => {
      const dateA = new Date(a.publishedAt || 0).getTime();
      const dateB = new Date(b.publishedAt || 0).getTime();
      return dateB - dateA;
    });

    return res.json(news.slice(0, limit));
  } catch (err) {
    console.error("news error:", err?.message || err);
    // Fall back to mock data on any error
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
    const category = req.query.category && req.query.category !== "all" ? req.query.category : undefined;
    let mockNews = generateMockNews(limit);
    if (category) {
      mockNews = mockNews.filter(item => item.category === category);
    }
    return res.json(mockNews);
  }
});

/**
 * Get news from Finnhub API (PRIMARY - live real-time data)
 */
router.get("/finnhub", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
    
    if (!process.env.FINNHUB_API_KEY) {
      return res.status(400).json({ 
        error: "Finnhub API key not configured",
        fallback: "Using alternative sources"
      });
    }

    console.log("📰 Fetching live news from Finnhub API...");
    const news = await newsAggregator.fetchFromFinnhub({ limit });

    res.json({
      status: "success",
      source: "finnhub",
      count: news.length,
      articles: news.slice(0, limit)
    });
  } catch (err) {
    console.error("Finnhub news error:", err.message);
    return res.status(500).json({ 
      error: "Failed to fetch Finnhub news",
      details: err.message
    });
  }
});

/**
 * Get news from Polygon API (SECONDARY - actually Massive API)
 * Note: Polygon news endpoint is part of Massive API
 */
router.get("/polygon", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
    
    if (!process.env.MASSIVE_API_KEY) {
      return res.status(400).json({ 
        error: "Massive API key not configured",
        fallback: "Using alternative sources"
      });
    }

    console.log("📰 Fetching live news from Polygon/Massive API...");
    const news = await newsAggregator.fetchFromPolygon({ limit });

    res.json({
      status: "success",
      source: "polygon",
      count: news.length,
      articles: news.slice(0, limit)
    });
  } catch (err) {
    console.error("Polygon news error:", err.message);
    return res.status(500).json({ 
      error: "Failed to fetch Polygon news",
      details: err.message
    });
  }
});

/**
 * Get news from Massive API (FALLBACK - live data)
 */
router.get("/massive", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
    
    if (!process.env.MASSIVE_API_KEY) {
      return res.status(400).json({ 
        error: "Massive API key not configured"
      });
    }

    console.log("📰 Fetching live news from Massive API...");
    const news = await newsAggregator.fetchFromMassive({ limit });

    res.json({
      status: "success",
      source: "massive",
      count: news.length,
      articles: news.slice(0, limit)
    });
  } catch (err) {
    console.error("Massive news error:", err.message);
    return res.status(500).json({ 
      error: "Failed to fetch Massive news",
      details: err.message
    });
  }
});

router.get("/reference", async (req, res) => {
  try {
    const key = process.env.MASSIVE_API_KEY;
    if (!key) return res.status(400).json({ error: "MASSIVE_API_KEY not set in server .env" });

    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
    const ticker = req.query.ticker || req.query.symbol || undefined;
    const order = req.query.order || "published_utc.desc";
    
    const params = {
      limit,
      order
    };
    if (ticker) {
      params.ticker = ticker;
      params.tickers = ticker;
    }

    let payload;
    try {
      payload = await massiveService.getReferenceNews(params);
    } catch (err) {
      if (err?.status && [400, 401, 403, 404].includes(err.status)) {
        // Try legacy endpoint
        const legacyParams = {
          limit,
          language: "en",
          ...params
        };
        payload = await fetchLegacyTopNews({ ...legacyParams, key });
      } else {
        throw err;
      }
    }

    const normalized = extractNewsList(payload)
      .map(normalizeNewsItem)
      .filter(Boolean);

    res.json({
      status: "success",
      results: normalized,
      count: normalized.length
    });
  } catch (err) {
    console.error("reference news error:", err?.details || err?.response?.data || err.message || err);
    return res.status(500).json({
      error: "Failed to fetch reference news",
      details: err?.details || err?.response?.data || err.message
    });
  }
});

/**
 * Server-Sent Events (SSE) endpoint for real-time news streaming
 * Clients connect and receive live news updates
 */
router.get("/stream", (req, res) => {
  // Generate unique client ID
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Register this client
  newsStreamingService.addClient(clientId, res);

  // Handle client disconnect
  req.on("close", () => {
    newsStreamingService.removeClient(clientId);
    res.end();
  });

  // Send initial heartbeat
  res.write(`data: ${JSON.stringify({ type: "connected", clientId, timestamp: new Date().toISOString() })}\n\n`);
});

/**
 * Endpoint to get current cached news
 */
router.get("/cached", (req, res) => {
  try {
    const category = req.query.category || "all";
    const search = req.query.search || "";
    const symbols = req.query.symbols || "";
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);

    let news = newsStreamingService.newsCache;

    // Apply filters
    if (category && category !== "all") {
      news = news.filter(item => item.category === category);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      news = news.filter(item =>
        item.title.toLowerCase().includes(lowerSearch) ||
        (item.description && item.description.toLowerCase().includes(lowerSearch))
      );
    }

    if (symbols) {
      const symbolSet = new Set(symbols.split(",").map(s => s.toUpperCase().trim()));
      news = news.filter(item =>
        item.tickers && item.tickers.some(ticker => symbolSet.has(ticker.toUpperCase()))
      );
    }

    res.json({
      status: "success",
      count: news.length,
      articles: news.slice(0, limit)
    });
  } catch (err) {
    console.error("Error fetching cached news:", err.message);
    return res.status(500).json({ error: "Failed to fetch cached news" });
  }
});

/**
 * Endpoint to get streaming statistics
 */
router.get("/stats", (req, res) => {
  try {
    const stats = newsStreamingService.getStats();
    res.json(stats);
  } catch (err) {
    console.error("Error fetching streaming stats:", err.message);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/**
 * Endpoint to manually trigger news refresh
 */
router.post("/refresh", async (req, res) => {
  try {
    console.log("📢 Manual news refresh requested");
    await newsStreamingService.fetchAndBroadcast();
    
    res.json({
      status: "success",
      message: "News refreshed",
      stats: newsStreamingService.getStats()
    });
  } catch (err) {
    console.error("Error refreshing news:", err.message);
    return res.status(500).json({ error: "Failed to refresh news" });
  }
});

/**
 * Endpoint to control streaming service
 */
router.post("/stream/control", (req, res) => {
  try {
    const { action } = req.body;

    if (action === "start") {
      newsStreamingService.start();
      return res.json({ status: "success", message: "Streaming started" });
    }

    if (action === "stop") {
      newsStreamingService.stop();
      return res.json({ status: "success", message: "Streaming stopped" });
    }

    if (action === "reset") {
      newsStreamingService.reset();
      return res.json({ status: "success", message: "Streaming reset" });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("Error controlling streaming:", err.message);
    return res.status(500).json({ error: "Failed to control streaming" });
  }
});

/**
 * Server-Sent Events (SSE) endpoint for real-time Finnhub news streaming
 * Clients connect and receive live news updates from Finnhub WebSocket
 * Falls back to REST API if WebSocket not available
 */
/**
 * Simple endpoint to get Finnhub news directly (testing)
 */
router.get("/finnhub/test", async (req, res) => {
  try {
    const finnhubKey = process.env.FINNHUB_API_KEY;
    
    if (!finnhubKey) {
      console.error("❌ FINNHUB_API_KEY not configured");
      return res.status(503).json({ 
        error: "Finnhub API key not configured",
        key: finnhubKey
      });
    }

    console.log(`📡 Testing Finnhub API with key: ${finnhubKey.substring(0, 10)}...`);
    
    const finnhubResponse = await axios.get("https://finnhub.io/api/v1/news", {
      params: {
        token: finnhubKey,
        limit: 5,
        minId: 0
      },
      timeout: 10000
    });

    const articles = Array.isArray(finnhubResponse.data) ? finnhubResponse.data : [];
    console.log(`✅ Received ${articles.length} articles from Finnhub`);
    
    return res.json({
      success: true,
      count: articles.length,
      articles: articles.slice(0, 2)
    });
  } catch (err) {
    console.error("Error in Finnhub test endpoint:", err.message);
    return res.status(500).json({ 
      error: "Failed to fetch from Finnhub",
      message: err.message 
    });
  }
});

router.get("/finnhub/stream", async (req, res) => {
  try {
    const finnhubKey = process.env.FINNHUB_API_KEY;
    
    if (!finnhubKey) {
      console.error("❌ FINNHUB_API_KEY not configured");
      return res.status(503).json({ 
        error: "Finnhub service not available",
        details: "FINNHUB_API_KEY not configured"
      });
    }

    // Generate unique client ID
    const clientId = `finnhub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Immediately send connected message
    res.write(`data: ${JSON.stringify({ 
      type: "connected", 
      clientId, 
      source: "finnhub",
      timestamp: new Date().toISOString() 
    })}\n\n`);

    // Fetch initial articles using cache - try Finnhub first, fallback to mock data on rate limit
    console.log(`📡 [${clientId}] Fetching initial articles...`);
    let initialArticles = [];
    let finnhubSuccess = false;

    // Use cached Finnhub articles
    const cachedArticles = await fetchFinnhubWithCache(finnhubKey);
    if (cachedArticles.length > 0) {
      initialArticles = cachedArticles;
      finnhubSuccess = true;
      console.log(`✅ [${clientId}] Got ${initialArticles.length} articles from Finnhub cache`);
    } else {
      // Fallback: use the aggregated news endpoint with mock data
      try {
        console.log(`📡 [${clientId}] Falling back to aggregated news...`);
        const internalApiBase =
          process.env.INTERNAL_API_BASE_URL ||
          `http://127.0.0.1:${process.env.PORT || 5000}`;
        const topNewsResponse = await axios.get(`${internalApiBase}/api/news/top?limit=50`);
        initialArticles = Array.isArray(topNewsResponse.data) ? topNewsResponse.data.map(item => ({
          ...item,
          // Ensure sourceLogo is always an array
          sourceLogo: Array.isArray(item.sourceLogo) ? item.sourceLogo : (item.sourceLogo ? [item.sourceLogo] : ["https://via.placeholder.com/48?text=News"])
        })) : [];
        console.log(`✅ [${clientId}] Got ${initialArticles.length} articles from aggregated news`);
      } catch (fallbackErr) {
        console.error(`❌ [${clientId}] Fallback also failed:`, fallbackErr.message);
        // Last resort: use mock data directly
        initialArticles = generateMockNews(50).map(item => ({
          ...item,
          // Ensure sourceLogo is always an array
          sourceLogo: Array.isArray(item.sourceLogo) ? item.sourceLogo : (item.sourceLogo ? [item.sourceLogo] : ["https://via.placeholder.com/48?text=News"])
        }));
        console.log(`✅ [${clientId}] Using ${initialArticles.length} mock articles`);
      }
    }

    // Send initial articles
    if (initialArticles.length > 0) {
      console.log(`📡 [${clientId}] Sending ${initialArticles.length} initial articles`);
      res.write(
        `data: ${JSON.stringify({
          type: "initial",
          articles: initialArticles,
          source: finnhubSuccess ? "finnhub" : "fallback",
          timestamp: new Date().toISOString()
        })}\n\n`
      );
    } else {
      console.log(`⚠️ [${clientId}] No articles available`);
    }

    // Handle client disconnect
    req.on("close", () => {
      res.end();
    });

    // Periodically refresh data (every 5 minutes)
    const refreshInterval = setInterval(async () => {
      if (!res.writableEnded) {
        try {
          let freshArticles = [];
          
          // Try Finnhub first
          try {
            // Use cached Finnhub articles for refresh
            const freshData = await fetchFinnhubWithCache(finnhubKey);
            freshArticles = freshData.slice(0, 10);
          } catch (refreshErr) {
            console.warn(`⚠️ Refresh: Finnhub error, using fallback`);
            // Fallback for refresh
            try {
              const internalApiBase =
                process.env.INTERNAL_API_BASE_URL ||
                `http://127.0.0.1:${process.env.PORT || 5000}`;
              const fallbackResponse = await axios.get(`${internalApiBase}/api/news/top?limit=10`);
              freshArticles = Array.isArray(fallbackResponse.data) ? fallbackResponse.data.map(item => ({
                ...item,
                // Ensure sourceLogo is always an array
                sourceLogo: Array.isArray(item.sourceLogo) ? item.sourceLogo : (item.sourceLogo ? [item.sourceLogo] : ["https://via.placeholder.com/48?text=News"])
              })) : [];
            } catch (err) {
              console.error(`❌ Refresh: All sources failed`);
            }
          }

          if (freshArticles.length > 0) {
            res.write(
              `data: ${JSON.stringify({
                type: "update",
                articles: freshArticles,
                timestamp: new Date().toISOString()
              })}\n\n`
            );
          }
        } catch (err) {
          console.error(`Error refreshing articles:`, err.message);
        }
      } else {
        clearInterval(refreshInterval);
      }
    }, 300000); // 5 minutes

    // Clean up interval on disconnect
    req.on("close", () => {
      clearInterval(refreshInterval);
    });
  } catch (err) {
    console.error("Error in Finnhub stream endpoint:", err);
    res.status(500).json({ error: "Failed to establish Finnhub stream" });
  }
});

/**
 * Get cached news from Finnhub
 */
router.get("/finnhub/cached", async (req, res) => {
  try {
    const finnhub = getFinnhubService();
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);

    // Get WebSocket cache first
    let cache = finnhub ? finnhub.getCache() : [];

    // If no cache or insufficient articles, fetch from aggregator
    if (cache.length < limit) {
      console.log(`📡 Cache has ${cache.length} articles, fetching more...`);
      try {
        const freshNews = await newsAggregator.aggregateNews({
          limit,
          includeMockData: true
        });
        cache = freshNews;
      } catch (err) {
        console.error("Error fetching Finnhub aggregated news:", err.message);
        // Keep existing cache even on error
      }
    }

    res.json({
      status: "success",
      source: "finnhub",
      count: cache.length,
      articles: cache.slice(0, limit),
      fromWebSocket: finnhub && finnhub.getCache().length > 0,
      fromAggregator: cache.length > 0 && (!finnhub || finnhub.getCache().length === 0)
    });
  } catch (err) {
    console.error("Error fetching Finnhub cached news:", err.message);
    return res.status(500).json({ error: "Failed to fetch cached news" });
  }
});

/**
 * Get Finnhub service status
 */
router.get("/finnhub/status", (req, res) => {
  try {
    const finnhub = getFinnhubService();
    
    if (!finnhub) {
      return res.status(503).json({ 
        error: "Finnhub service not available"
      });
    }

    const status = finnhub.getStatus();
    res.json({
      status: "success",
      source: "finnhub",
      ...status
    });
  } catch (err) {
    console.error("Error getting Finnhub status:", err.message);
    return res.status(500).json({ error: "Failed to get status" });
  }
});

/**
 * Control Finnhub service
 */
router.post("/finnhub/control", (req, res) => {
  try {
    const { action } = req.body;
    const finnhub = getFinnhubService();
    
    if (!finnhub) {
      return res.status(503).json({ 
        error: "Finnhub service not available"
      });
    }

    if (action === "start") {
      finnhub.start();
      return res.json({ 
        status: "success", 
        message: "Finnhub streaming started",
        serviceStatus: finnhub.getStatus()
      });
    }

    if (action === "stop") {
      finnhub.stop();
      return res.json({ 
        status: "success", 
        message: "Finnhub streaming stopped",
        serviceStatus: finnhub.getStatus()
      });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error("Error controlling Finnhub service:", err.message);
    return res.status(500).json({ error: "Failed to control Finnhub service" });
  }
});

export default router;
