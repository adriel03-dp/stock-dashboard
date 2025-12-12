import WebSocket from "ws";

const DEFAULT_REALTIME_ENDPOINT = "wss://socket.massive.com/stocks";
const DEFAULT_DELAYED_ENDPOINT = "wss://delayed.massive.com/stocks";
const DEFAULT_BUSINESS_ENDPOINT = "wss://business.massive.com/stocks";

function normalizeSymbol(value) {
  if (!value) return null;
  const stringValue = String(value).trim();
  if (!stringValue) return null;
  return stringValue.toUpperCase();
}

function stripChannelPrefix(value) {
  if (!value || typeof value !== "string") return value;
  if (value.includes(".")) {
    return value.split(".").pop();
  }
  return value;
}

function createCommandMessage(action, params) {
  if (!params || (Array.isArray(params) && !params.length)) return null;
  const payload = Array.isArray(params) ? params.join(",") : params;
  return JSON.stringify({ action, params: payload });
}

class MassiveStockStream {
  constructor({ name, endpoints, apiKey }) {
    this.name = name;
    this.endpoints = Array.isArray(endpoints) && endpoints.length ? endpoints.filter(Boolean) : [DEFAULT_REALTIME_ENDPOINT];
    this.apiKey = apiKey;
    this.ws = null;
    this.endpointIndex = 0;
    this.connected = false;
    this.connecting = false;
    this.outgoingBuffer = [];
    this.clients = new Map(); // clientId -> { res, symbols, keepAlive }
    this.symbolClients = new Map(); // symbol -> Set<clientId>
    this.symbolCounts = new Map(); // symbol -> count
    this.subscribedSymbols = new Set();
    this.clientIdSeq = 0;
    this.reconnectDelay = 1000;
    this.reconnectTimer = null;
  }

  hasClients() {
    return this.clients.size > 0;
  }

  getCurrentEndpoint() {
    if (!this.endpoints.length) {
      throw new Error(`[${this.name}] No Massive WebSocket endpoints configured`);
    }
    return this.endpoints[this.endpointIndex % this.endpoints.length];
  }

  scheduleReconnect() {
    if (!this.hasClients()) {
      this.connecting = false;
      return;
    }

    if (this.reconnectTimer) return;

    const delay = this.reconnectDelay;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 15000);
      this.endpointIndex = (this.endpointIndex + 1) % this.endpoints.length;
      this.connect();
    }, delay).unref?.();
  }

  connect() {
    if (this.connecting || this.connected) return;
    if (!this.apiKey) {
      throw new Error("MASSIVE_API_KEY is required for WebSocket streaming");
    }

    const url = this.getCurrentEndpoint();
    this.connecting = true;

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      this.connecting = false;
      console.error(`[${this.name}] Failed to initiate WebSocket`, err?.message || err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this.connected = true;
      this.connecting = false;
      this.reconnectDelay = 1000;
      this.flushBuffer();
      this.authenticate();
      this.resubscribeAll();
    });

    this.ws.on("message", (raw) => {
      const text = raw.toString();
      this.handleMessage(text);
    });

    this.ws.on("error", (err) => {
      console.error(`[${this.name}] WebSocket error`, err?.message || err);
    });

    this.ws.on("close", (code, reason) => {
      this.connected = false;
      this.connecting = false;
      this.ws = null;
      const description = reason ? reason.toString() : "";
      console.warn(`[${this.name}] WebSocket closed (${code || "unknown"}) ${description}`);
      if (this.hasClients()) {
        this.scheduleReconnect();
      }
    });
  }

  ensureConnection() {
    if (!this.hasClients()) return;
    if (this.connected || this.connecting) return;
    this.connect();
  }

  authenticate() {
    const message = createCommandMessage("auth", this.apiKey);
    if (message) this.sendRaw(message);
  }

  flushBuffer() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.outgoingBuffer.length) {
      const message = this.outgoingBuffer.shift();
      try {
        this.ws.send(message);
      } catch (err) {
        console.error(`[${this.name}] Failed to send message`, err?.message || err);
        break;
      }
    }
  }

  sendRaw(message) {
    if (!message) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(message);
      } catch (err) {
        console.error(`[${this.name}] Failed to send WebSocket payload`, err?.message || err);
      }
    } else {
      this.outgoingBuffer.push(message);
    }
  }

  subscribeSymbol(symbol) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    const nextCount = (this.symbolCounts.get(normalized) || 0) + 1;
    this.symbolCounts.set(normalized, nextCount);
    if (nextCount > 1 && this.subscribedSymbols.has(normalized)) {
      return;
    }

    this.subscribedSymbols.add(normalized);
    const channels = [`T.${normalized}`, `A.${normalized}`];
    const message = createCommandMessage("subscribe", channels);
    this.sendRaw(message);
  }

  unsubscribeSymbol(symbol) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    const current = this.symbolCounts.get(normalized) || 0;
    if (current <= 1) {
      this.symbolCounts.delete(normalized);
      if (this.subscribedSymbols.delete(normalized)) {
        const channels = [`T.${normalized}`, `A.${normalized}`];
        const message = createCommandMessage("unsubscribe", channels);
        this.sendRaw(message);
      }
    } else {
      this.symbolCounts.set(normalized, current - 1);
    }
  }

  resubscribeAll() {
    this.subscribedSymbols.forEach((symbol) => {
      const channels = [`T.${symbol}`, `A.${symbol}`];
      const message = createCommandMessage("subscribe", channels);
      this.sendRaw(message);
    });
  }

  addClient(symbols, res) {
    const normalizedSymbols = new Set();
    symbols.forEach((value) => {
      const symbol = normalizeSymbol(value);
      if (!symbol) return;
      normalizedSymbols.add(symbol);
    });

    if (!normalizedSymbols.size) {
      return null;
    }

    this.clientIdSeq += 1;
    const clientId = `client-${this.clientIdSeq}`;

    normalizedSymbols.forEach((symbol) => {
      let subscribers = this.symbolClients.get(symbol);
      if (!subscribers) {
        subscribers = new Set();
        this.symbolClients.set(symbol, subscribers);
      }
      subscribers.add(clientId);
      this.subscribeSymbol(symbol);
    });

    const keepAlive = setInterval(() => {
      try {
        res.write(": keep-alive\n\n");
      } catch (err) {
        this.removeClient(clientId);
      }
    }, 25000);

    this.clients.set(clientId, { res, symbols: normalizedSymbols, keepAlive });
    this.ensureConnection();

    return clientId;
  }

  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.keepAlive) {
      clearInterval(client.keepAlive);
    }

    client.symbols.forEach((symbol) => {
      const subscribers = this.symbolClients.get(symbol);
      if (subscribers) {
        subscribers.delete(clientId);
        if (!subscribers.size) {
          this.symbolClients.delete(symbol);
        }
      }
      this.unsubscribeSymbol(symbol);
    });

    this.clients.delete(clientId);

    if (!this.hasClients() && this.ws) {
      try {
        this.ws.close(1000, "no-clients");
      } catch (err) {
        console.error(`[${this.name}] Failed to close WebSocket`, err?.message || err);
      }
    }
  }

  handleMessage(raw) {
    if (!raw) return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      console.error(`[${this.name}] Failed to parse WebSocket message`, err?.message || err, raw);
      return;
    }

    const events = Array.isArray(payload) ? payload : [payload];
    events.forEach((event) => this.processEvent(event));
  }

  processEvent(event) {
    if (!event || typeof event !== "object") return;

    if (event.status) {
      const message = event.message || event.reason || event.status;
      if (event.status !== "success") {
        console.warn(`[${this.name}] status`, message);
      }
      return;
    }

    const rawSymbol = event.sym || event.symbol || event.ticker || event.S || event.T || event.stock;
    const normalized = normalizeSymbol(stripChannelPrefix(rawSymbol));
    if (!normalized) return;

    const clients = this.symbolClients.get(normalized);
    if (!clients || !clients.size) return;

    const type = event.ev || event.eventType || event.type || "tick";
    const data = JSON.stringify({ type, symbol: normalized, data: event });

    clients.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (!client) return;
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch (err) {
        this.removeClient(clientId);
      }
    });
  }
}

const apiKey = process.env.MASSIVE_API_KEY;

const realtimeEndpoints = [
  process.env.MASSIVE_STOCKS_REALTIME_WS,
  process.env.MASSIVE_STOCKS_BUSINESS_WS,
  process.env.MASSIVE_STOCKS_DELAYED_WS,
  DEFAULT_REALTIME_ENDPOINT,
  DEFAULT_BUSINESS_ENDPOINT,
  DEFAULT_DELAYED_ENDPOINT
].filter(Boolean);

const delayedEndpoints = [
  process.env.MASSIVE_STOCKS_DELAYED_WS,
  DEFAULT_DELAYED_ENDPOINT
].filter(Boolean);

export const realtimeStockStreamHub = new MassiveStockStream({
  name: "massive-stocks-realtime",
  endpoints: realtimeEndpoints,
  apiKey
});

export const delayedStockStreamHub = new MassiveStockStream({
  name: "massive-stocks-delayed",
  endpoints: delayedEndpoints,
  apiKey
});

export function selectHub(feed = "realtime") {
  if (feed === "delayed") return delayedStockStreamHub;
  return realtimeStockStreamHub;
}
