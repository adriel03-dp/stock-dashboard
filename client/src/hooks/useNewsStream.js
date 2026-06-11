import { useEffect, useState, useRef, useCallback } from "react";
import { getApiBaseUrl } from "../utils/apiBase";

/**
 * Hook to consume real-time news stream from server
 * Uses Server-Sent Events (SSE) for efficient real-time updates
 */
export function useNewsStream(enabled = true, onNewArticles = null) {
  const [articles, setArticles] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const seenUrlsRef = useRef(new Set());

  /**
   * Connect to news stream
   */
  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    try {
      console.log("🔗 Connecting to news stream...");
      const apiBaseUrl = getApiBaseUrl();
      const eventSource = new EventSource(`${apiBaseUrl}/news/stream`);

      eventSource.onopen = () => {
        console.log("✅ Connected to news stream");
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "connected":
              console.log(`📡 Connected with client ID: ${data.clientId}`);
              break;

            case "initial":
              // Receive initial cached articles
              if (Array.isArray(data.articles)) {
                console.log(`📰 Received ${data.articles.length} initial articles`);
                data.articles.forEach(article => {
                  seenUrlsRef.current.add(article.url || article.title);
                });
                setArticles(data.articles);
              }
              break;

            case "update":
              // Receive batch of new articles
              if (Array.isArray(data.articles) && data.articles.length > 0) {
                console.log(`✨ Received ${data.articles.length} new articles`);
                setArticles(prev => [...data.articles, ...prev]);
                
                data.articles.forEach(article => {
                  seenUrlsRef.current.add(article.url || article.title);
                });

                // Notify parent component
                if (onNewArticles) {
                  onNewArticles(data.articles);
                }
              }
              break;

            case "new_article":
              // Receive single new article for real-time ticker effect
              if (data.article) {
                const url = data.article.url || data.article.title;
                if (!seenUrlsRef.current.has(url)) {
                  console.log(`🔥 New article: ${data.article.title}`);
                  setArticles(prev => [data.article, ...prev]);
                  seenUrlsRef.current.add(url);

                  if (onNewArticles) {
                    onNewArticles([data.article]);
                  }
                }
              }
              break;

            case "heartbeat":
              // Receive periodic heartbeat
              console.log(`💓 Heartbeat - ${data.clientCount} clients, ${data.cachedArticles} articles cached`);
              setStats({
                connectedClients: data.clientCount,
                cachedArticles: data.cachedArticles,
                lastUpdate: new Date(data.timestamp)
              });
              break;

            case "error":
              console.error(`⚠️ Server error: ${data.message}`);
              setError(data.message);
              break;

            case "reset":
              console.log("🔄 Stream reset");
              setArticles([]);
              seenUrlsRef.current.clear();
              break;

            default:
              console.log("Received data:", data);
          }
        } catch (err) {
          console.error("Error parsing stream message:", err);
        }
      };

      eventSource.onerror = (err) => {
        if (enabled) {
          console.error("❌ Stream connection error:", err);
          setIsConnected(false);
          setError("Connection lost");
          eventSourceRef.current = null;

          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Attempting to reconnect...");
            connect();
          }, 5000);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error("Failed to connect to news stream:", err);
      setError(err.message);
      setIsConnected(false);
    }
  }, [enabled, onNewArticles]);

  /**
   * Disconnect from stream
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log("🔌 Disconnecting from news stream");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Fetch cached articles with filters
   */
  const fetchCached = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.search) params.append("search", filters.search);
      if (filters.symbols) params.append("symbols", filters.symbols);
      if (filters.limit) params.append("limit", filters.limit);

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/news/cached?${params}`);
      const data = await response.json();

      if (data.status === "success") {
        console.log(`📦 Fetched ${data.count} cached articles`);
        return data.articles;
      }
    } catch (err) {
      console.error("Error fetching cached articles:", err);
    }
    return [];
  }, []);

  /**
   * Manually refresh news
   */
  const refresh = useCallback(async () => {
    try {
      console.log("🔃 Refreshing news...");
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/news/refresh`, { method: "POST" });
      const data = await response.json();
      console.log("Refresh result:", data);
      return data;
    } catch (err) {
      console.error("Error refreshing news:", err);
    }
  }, []);

  /**
   * Fetch streaming stats
   */
  const fetchStats = useCallback(async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/news/stats`);
      const data = await response.json();
      setStats(data);
      return data;
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  /**
   * Control streaming service
   */
  const controlStream = useCallback(async (action) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/news/stream/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      console.log(`Stream ${action} result:`, data);
      return data;
    } catch (err) {
      console.error(`Error controlling stream (${action}):`, err);
    }
  }, []);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    articles,
    isConnected,
    stats,
    error,
    connect,
    disconnect,
    fetchCached,
    refresh,
    fetchStats,
    controlStream
  };
}

/**
 * Hook to use static news (fallback for non-SSE systems)
 * Does client-side filtering, so fetch only on mount
 */
export function useStaticNews(options = {}) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedRef = useRef(false);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // Always fetch more articles for client-side filtering
      params.append("limit", options.limit || 100);

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/news/top?${params}`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        console.log(`✅ Loaded ${data.length} news articles`);
        setArticles(data);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching news:", err);
      setError(err.message || "Failed to load news");
    } finally {
      setLoading(false);
    }
  }, [options.limit]);

  useEffect(() => {
    // Only fetch once on mount
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNews();
      
      // Refresh every 5 minutes
      const interval = setInterval(fetchNews, 300000);
      return () => clearInterval(interval);
    }
  }, [fetchNews]);

  return { articles, loading, error, refetch: fetchNews };
}
