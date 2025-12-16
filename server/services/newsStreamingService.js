import axios from "axios";
import { generateMockNews } from "./mockData.js";
import newsAggregator from "./newsAggregatorService.js";

/**
 * News streaming service for real-time updates
 * Periodically fetches news and maintains a stream of updates
 */
class NewsStreamingService {
  constructor() {
    this.clients = new Map(); // Track connected SSE clients
    this.newsCache = [];
    this.seenUrls = new Set();
    this.lastFetchTime = null;
    this.fetchInterval = 60000; // Fetch every 60 seconds
    this.isRunning = false;
    this.newsBuffer = []; // Buffer for new articles
  }

  /**
   * Register a new SSE client
   */
  addClient(clientId, res) {
    this.clients.set(clientId, res);
    console.log(`📡 Client ${clientId} connected. Total clients: ${this.clients.size}`);
    
    // Send initial cached news to new client
    if (this.newsCache.length > 0) {
      res.write(`data: ${JSON.stringify({ type: "initial", articles: this.newsCache.slice(0, 50) })}\n\n`);
    }
  }

  /**
   * Remove disconnected client
   */
  removeClient(clientId) {
    this.clients.delete(clientId);
    console.log(`📡 Client ${clientId} disconnected. Total clients: ${this.clients.size}`);
  }

  /**
   * Broadcast news update to all connected clients
   */
  broadcastUpdate(data) {
    for (const [clientId, res] of this.clients) {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error(`Error broadcasting to client ${clientId}:`, err.message);
        this.removeClient(clientId);
      }
    }
  }

  /**
   * Start the news streaming loop
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️ News streaming already running");
      return;
    }

    console.log("🚀 Starting real-time news streaming...");
    this.isRunning = true;

    // Initial fetch
    this.fetchAndBroadcast();

    // Periodic fetching
    this.streamInterval = setInterval(() => {
      this.fetchAndBroadcast();
    }, this.fetchInterval);
  }

  /**
   * Stop the news streaming loop
   */
  stop() {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }
    this.isRunning = false;
    console.log("🛑 Stopped real-time news streaming");
  }

  /**
   * Fetch news and broadcast new articles
   */
  async fetchAndBroadcast() {
    try {
      const news = await newsAggregator.aggregateNews({
        limit: 100,
        includeMockData: true
      });

      if (!Array.isArray(news)) {
        console.warn("Invalid news response");
        return;
      }

      // Find new articles (not seen before)
      const newArticles = news.filter(article => {
        const url = article.url || article.title;
        if (this.seenUrls.has(url)) {
          return false;
        }
        this.seenUrls.add(url);
        return true;
      });

      // Update cache
      this.newsCache = [
        ...newArticles,
        ...this.newsCache
      ].slice(0, 200); // Keep last 200 articles

      if (newArticles.length > 0) {
        console.log(`✨ Found ${newArticles.length} new articles`);
        
        // Broadcast new articles to all clients
        this.broadcastUpdate({
          type: "update",
          articles: newArticles,
          timestamp: new Date().toISOString(),
          totalCached: this.newsCache.length
        });

        // Also send as individual articles for real-time ticker effect
        for (const article of newArticles.slice(0, 5)) {
          setTimeout(() => {
            this.broadcastUpdate({
              type: "new_article",
              article: article,
              timestamp: new Date().toISOString()
            });
          }, 500);
        }
      } else {
        console.log("ℹ️ No new articles since last check");
        
        // Send heartbeat
        this.broadcastUpdate({
          type: "heartbeat",
          timestamp: new Date().toISOString(),
          clientCount: this.clients.size,
          cachedArticles: this.newsCache.length
        });
      }
    } catch (err) {
      console.error("Error fetching news for streaming:", err.message);
      
      // Broadcast error to clients
      this.broadcastUpdate({
        type: "error",
        message: "Failed to fetch news",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get news by category with streaming
   */
  async getNewsByCategory(category) {
    if (!category || category === "all") {
      return this.newsCache;
    }
    return this.newsCache.filter(article => article.category === category);
  }

  /**
   * Search news in cache
   */
  searchNews(query) {
    if (!query) return this.newsCache;
    
    const lowerQuery = query.toLowerCase();
    return this.newsCache.filter(article =>
      article.title.toLowerCase().includes(lowerQuery) ||
      (article.description && article.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Filter by symbols
   */
  filterBySymbols(symbols) {
    if (!symbols) return this.newsCache;
    
    const symbolSet = new Set(symbols.split(",").map(s => s.toUpperCase().trim()));
    return this.newsCache.filter(article =>
      article.tickers && article.tickers.some(ticker => symbolSet.has(ticker.toUpperCase()))
    );
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      connectedClients: this.clients.size,
      cachedArticles: this.newsCache.length,
      uniqueUrls: this.seenUrls.size,
      lastFetch: this.lastFetchTime,
      fetchInterval: this.fetchInterval
    };
  }

  /**
   * Clear all data and reconnect clients
   */
  reset() {
    this.newsCache = [];
    this.seenUrls.clear();
    this.lastFetchTime = null;
    
    // Notify all clients of reset
    this.broadcastUpdate({
      type: "reset",
      timestamp: new Date().toISOString()
    });
    
    // Start fresh
    this.fetchAndBroadcast();
  }
}

// Create singleton instance
const newsStreamingService = new NewsStreamingService();

export default newsStreamingService;
