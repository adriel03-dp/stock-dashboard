import WebSocket from "ws";

/**
 * Finnhub real-time news streaming service
 * Connects to Finnhub WebSocket API to get live news
 */
class FinnhubNewsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ws = null;
    this.isConnected = false;
    this.clients = new Map(); // Track connected SSE clients
    this.newsCache = [];
    this.seenNewsIds = new Set();
    this.isRunning = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  /**
   * Register a new SSE client
   */
  addClient(clientId, res) {
    this.clients.set(clientId, res);
    console.log(
      `📡 Finnhub client ${clientId} connected. Total clients: ${this.clients.size}`
    );

    // Send initial cached news to new client
    if (this.newsCache.length > 0) {
      res.write(
        `data: ${JSON.stringify({
          type: "initial",
          articles: this.newsCache.slice(0, 50),
          source: "finnhub"
        })}\n\n`
      );
    }
  }

  /**
   * Remove disconnected client
   */
  removeClient(clientId) {
    this.clients.delete(clientId);
    console.log(
      `📡 Finnhub client ${clientId} disconnected. Total clients: ${this.clients.size}`
    );
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
   * Normalize Finnhub news item to standard format
   */
  normalizeFinnhubNews(newsItem) {
    return {
      id: newsItem.urlId || newsItem.url || newsItem.headline,
      title: newsItem.headline || "Untitled",
      description: newsItem.summary || "",
      url: newsItem.url || null,
      image: newsItem.image || null,
      source: newsItem.source || "Finnhub",
      category: newsItem.category || "news",
      related: newsItem.related || [],
      publishedAt: newsItem.datetime
        ? new Date(newsItem.datetime * 1000).toISOString()
        : new Date().toISOString(),
      timestamp: newsItem.datetime
    };
  }

  /**
   * Connect to Finnhub WebSocket
   */
  connect() {
    if (!this.apiKey) {
      console.error("❌ Finnhub API key not set");
      return;
    }

    if (this.isConnected && this.ws) {
      console.log("⚠️ Already connected to Finnhub");
      return;
    }

    try {
      console.log("🔗 Connecting to Finnhub WebSocket...");
      const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("✅ Connected to Finnhub WebSocket");
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Subscribe to news
        this.subscribeToNews();

        // Send connection notification
        this.broadcastUpdate({
          type: "connected",
          source: "finnhub",
          timestamp: new Date().toISOString()
        });
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error("❌ Finnhub WebSocket error:", error);
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        console.log("🔌 Finnhub WebSocket closed");
        this.isConnected = false;
        this.attemptReconnect();
      };
    } catch (err) {
      console.error("Error connecting to Finnhub:", err);
      this.attemptReconnect();
    }
  }

  /**
   * Subscribe to Finnhub news stream
   */
  subscribeToNews() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not ready");
      return;
    }

    try {
      // Subscribe to news updates (no specific symbol = all news)
      this.ws.send(JSON.stringify({ type: "subscribe", symbol: "news" }));
      console.log("📰 Subscribed to Finnhub news stream");
    } catch (err) {
      console.error("Error subscribing to news:", err);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data);

      // Finnhub sends ping messages to keep connection alive
      if (message.type === "ping") {
        console.log("📍 Finnhub ping received");
        return;
      }

      // Handle news data
      if (message.type === "news" && Array.isArray(message.data)) {
        const newArticles = message.data
          .map((item) => this.normalizeFinnhubNews(item))
          .filter((article) => {
            const id = article.id;
            if (this.seenNewsIds.has(id)) {
              return false;
            }
            this.seenNewsIds.add(id);
            return true;
          });

        if (newArticles.length > 0) {
          console.log(`✨ Received ${newArticles.length} new articles from Finnhub`);

          // Update cache
          this.newsCache = [...newArticles, ...this.newsCache].slice(0, 200);

          // Broadcast to all connected clients
          this.broadcastUpdate({
            type: "update",
            articles: newArticles,
            source: "finnhub",
            timestamp: new Date().toISOString(),
            totalCached: this.newsCache.length
          });

          // Send individual articles for real-time effect
          for (const article of newArticles.slice(0, 3)) {
            setTimeout(
              () => {
                this.broadcastUpdate({
                  type: "new_article",
                  article: article,
                  source: "finnhub",
                  timestamp: new Date().toISOString()
                });
              },
              Math.random() * 1000
            );
          }
        }
      }
    } catch (err) {
      console.error("Error handling Finnhub message:", err);
    }
  }

  /**
   * Attempt to reconnect to Finnhub
   */
  attemptReconnect() {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.isRunning
    ) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(
        `🔄 Attempting to reconnect to Finnhub (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`
      );

      setTimeout(() => {
        if (this.isRunning && !this.isConnected) {
          this.connect();
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnection attempts reached for Finnhub");
    }
  }

  /**
   * Start the Finnhub news streaming service
   */
  start() {
    if (this.isRunning) {
      console.log("⚠️ Finnhub service already running");
      return;
    }

    console.log("🚀 Starting Finnhub news service...");
    this.isRunning = true;
    this.connect();
  }

  /**
   * Stop the Finnhub news streaming service
   */
  stop() {
    console.log("🛑 Stopping Finnhub news service...");
    this.isRunning = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get current news cache
   */
  getCache() {
    return this.newsCache;
  }

  /**
   * Check if connected
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      cachedArticles: this.newsCache.length,
      seenNewsCount: this.seenNewsIds.size
    };
  }
}

export default FinnhubNewsService;
