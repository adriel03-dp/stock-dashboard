import { useEffect, useState, useRef, useCallback } from "react";
import { getApiBaseUrl } from "../utils/apiBase";

/**
 * Hook to consume real-time Finnhub news stream
 * Uses Server-Sent Events (SSE) for efficient real-time updates
 */
export function useFinnhubNews(enabled = true, onNewArticles = null) {
  const [articles, setArticles] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const seenUrlsRef = useRef(new Set());

  /**
   * Connect to Finnhub news stream
   */
  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    try {
      console.log("🔗 Connecting to Finnhub news stream...");
      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/news/finnhub/stream`;
      console.log("📍 EventSource URL:", url);
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log("✅ Connected to Finnhub stream");
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "connected":
              console.log(
                `📡 Finnhub connected with client ID: ${data.clientId}`
              );
              break;

            case "initial":
              // Receive initial cached articles
              if (Array.isArray(data.articles)) {
                console.log(
                  `📰 Received ${data.articles.length} initial Finnhub articles`
                );
                data.articles.forEach((article) => {
                  seenUrlsRef.current.add(article.url || article.id);
                });
                setArticles(data.articles);
              }
              break;

            case "update":
              // Receive batch of new articles
              if (
                Array.isArray(data.articles) &&
                data.articles.length > 0
              ) {
                console.log(
                  `✨ Received ${data.articles.length} new Finnhub articles`
                );
                setArticles((prev) => [...data.articles, ...prev]);

                data.articles.forEach((article) => {
                  seenUrlsRef.current.add(article.url || article.id);
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
                const articleId = data.article.url || data.article.id;
                if (!seenUrlsRef.current.has(articleId)) {
                  console.log(`🔥 New Finnhub article: ${data.article.title}`);
                  setArticles((prev) => [data.article, ...prev]);
                  seenUrlsRef.current.add(articleId);

                  if (onNewArticles) {
                    onNewArticles([data.article]);
                  }
                }
              }
              break;

            case "heartbeat":
              // Connection still alive
              console.log("💓 Finnhub heartbeat received");
              break;

            default:
              console.log("📩 Finnhub message:", data.type);
          }
        } catch (parseErr) {
          console.error("Error parsing Finnhub message:", parseErr);
        }
      };

      eventSource.onerror = (error) => {
        if (enabled) {
          console.error("❌ Finnhub stream error:", error);
          console.error("ReadyState:", eventSource?.readyState);
          setIsConnected(false);
          setError("Connection error");
          eventSourceRef.current = null;
          attemptReconnect();
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error("Error connecting to Finnhub stream:", err);
      setError(err.message);
      attemptReconnect();
    }
  }, [enabled, onNewArticles]);

  /**
   * Disconnect from stream
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Attempt to reconnect to stream
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (enabled && !eventSourceRef.current) {
        console.log("🔄 Attempting to reconnect to Finnhub stream...");
        connect();
      }
    }, 3000);
  }, [enabled, connect]);

  /**
   * Refresh news (pull latest from cache)
   */
  const refresh = useCallback(async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/news/finnhub/cached?limit=50`);
      const data = await response.json();

      if (data.articles && Array.isArray(data.articles)) {
        console.log(`🔄 Refreshed ${data.articles.length} articles from cache`);
        data.articles.forEach((article) => {
          seenUrlsRef.current.add(article.url || article.id);
        });
        setArticles(data.articles);
      }
    } catch (err) {
      console.error("Error refreshing Finnhub news:", err);
      setError("Failed to refresh news");
    }
  }, []);

  /**
   * Get service status
   */
  const getStatus = useCallback(async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/news/finnhub/status`);
      const data = await response.json();
      setStatus(data);
      return data;
    } catch (err) {
      console.error("Error getting Finnhub status:", err);
    }
  }, []);

  /**
   * Control Finnhub service
   */
  const controlStream = useCallback(
    async (action) => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/news/finnhub/control`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        });
        const data = await response.json();
        console.log(`Finnhub service ${action} result:`, data);
        return data;
      } catch (err) {
        console.error(`Error ${action}ing Finnhub service:`, err);
        setError(`Failed to ${action} service`);
      }
    },
    []
  );

  // Connect/disconnect based on enabled prop
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, connect, disconnect]);

  return {
    articles,
    isConnected,
    error,
    status,
    refresh,
    getStatus,
    controlStream,
    disconnect,
    connect
  };
}
