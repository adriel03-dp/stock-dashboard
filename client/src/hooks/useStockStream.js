import { useEffect, useRef, useState } from "react";

function parseEventData(data) {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to parse stock stream payload", err);
    return null;
  }
}

function normalizeOptions(options) {
  if (!options) return {};
  if (typeof options === "string") return { feed: options };
  return options;
}

function getStreamBase() {
  if (typeof window === "undefined") return "";
  const baseEnv = import.meta.env.VITE_API_STREAM_BASE || import.meta.env.VITE_API_BASE;
  if (baseEnv) return baseEnv.replace(/\/+$/, "");
  // default to localhost:5000 in dev, otherwise same origin
  const { protocol, hostname } = window.location;
  const defaultPort = hostname === "localhost" || hostname === "127.0.0.1" ? "5000" : window.location.port;
  const origin = `${protocol}//${hostname}${defaultPort ? `:${defaultPort}` : ""}`;
  return `${origin}/api`;
}

export default function useStockStream(symbol, options) {
  const { feed = "realtime" } = normalizeOptions(options);
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState("idle");
  const sourceRef = useRef(null);

  useEffect(() => {
    const trimmed = typeof symbol === "string" ? symbol.trim().toUpperCase() : "";
    if (!trimmed) {
      setStatus("idle");
      setEvent(null);
      return () => {
        if (sourceRef.current) {
          sourceRef.current.close();
          sourceRef.current = null;
        }
      };
    }

    const params = new URLSearchParams({ symbols: trimmed });
    if (feed === "delayed") {
      params.set("feed", "delayed");
    }

    const base = getStreamBase();
    const endpoint = `${base}/live/stock/stream?${params.toString()}`;
    setStatus("connecting");

    const source = new EventSource(endpoint);
    sourceRef.current = source;

    const handleMessage = (message) => {
      const payload = parseEventData(message.data);
      if (!payload) return;
      if (payload.type === "ready") {
        setStatus("ready");
        return;
      }
      setStatus("streaming");
      setEvent(payload);
    };

    const handleError = () => {
      setStatus("error");
      source.close();
      sourceRef.current = null;
    };

    const handleStreamError = (message) => {
      const payload = parseEventData(message.data);
      if (payload?.error) {
        console.error("Stock stream error", payload.error);
      }
      setStatus("error");
      source.close();
      sourceRef.current = null;
    };

    source.onmessage = handleMessage;
    source.onerror = handleError;
    source.addEventListener("stream-error", handleStreamError);

    return () => {
      source.removeEventListener("stream-error", handleStreamError);
      source.close();
      sourceRef.current = null;
    };
  }, [symbol, feed]);

  return { event, status };
}
