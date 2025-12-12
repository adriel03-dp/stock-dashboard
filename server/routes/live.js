import express from "express";
import {
  fetchQuoteFMP,
  fetchHistoricalFMP,
  normalizeQuote,
  normalizeHistory
} from "../services/fmpService.js";
import { fetchCoinMarket, fetchTopCoins } from "../services/binanceService.js";
import { fetchMassiveStockSummary } from "../utils/stockData.js";
import { massiveService } from "../services/massiveService.js";
import { selectHub } from "../realtime/stockStreamHub.js";
import { generateMockTopCoins } from "../services/mockData.js";

const router = express.Router();

function normalizeMassiveHistory(payload) {
  const list = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
  return list
    .map((point) => {
      const timestamp = point?.t ?? point?.timestamp ?? point?.time ?? null;
      const close = point?.c ?? point?.close ?? null;
      if (timestamp == null || close == null) return null;
      const jsDate = new Date(Number(timestamp));
      const iso = Number.isNaN(jsDate.getTime()) ? null : jsDate.toISOString();
      return iso ? { date: iso, close } : null;
    })
    .filter(Boolean);
}

router.get("/stock/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  if (process.env.FMP_API_KEY) {
    try {
      const [quoteRaw, historyRaw] = await Promise.all([
        fetchQuoteFMP(symbol),
        fetchHistoricalFMP(symbol)
      ]);
      if (!quoteRaw) return res.status(404).json({ error: "Quote not found" });

      const quote = normalizeQuote(quoteRaw, symbol);
      const history = normalizeHistory(historyRaw || []);
      return res.json({ ...quote, history });
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch stock data" });
    }
  }

  if (!process.env.MASSIVE_API_KEY) {
    return res.status(400).json({ error: "No stock data provider configured" });
  }

  try {
    const summary = await fetchMassiveStockSummary(symbol);
    if (!summary) return res.status(404).json({ error: "Quote not found" });

    let history = [];
    try {
      const to = Date.now();
      const from = to - 365 * 24 * 60 * 60 * 1000;
      const agg = await massiveService.getAggregates(symbol, 1, "day", from, to, { adjusted: true, sort: "asc" });
      history = normalizeMassiveHistory(agg?.results || agg || []);
    } catch (err) {
      history = [];
    }

    const day = summary.snapshot?.day || {};
    return res.json({
      symbol: summary.symbol,
      name: summary.name,
      price: summary.price,
      change: summary.changePercent ?? summary.change ?? null,
      changePercent: summary.changePercent ?? null,
      open: day.open ?? null,
      high: day.high ?? null,
      low: day.low ?? null,
      previousClose: summary.previousClose ?? day.close ?? null,
      history
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stock data" });
  }
});

router.get("/stock/stream", (req, res) => {
  if (!process.env.MASSIVE_API_KEY) {
    return res.status(400).json({ error: "Real-time streaming requires MASSIVE_API_KEY" });
  }

  const symbolParam = req.query.symbols || req.query.symbol;
  if (!symbolParam) {
    return res.status(400).json({ error: "Query parameter 'symbols' is required" });
  }

  const symbols = String(symbolParam)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({ error: "Provide at least one symbol" });
  }

  const feed = req.query.feed === "delayed" ? "delayed" : "realtime";
  const hub = selectHub(feed);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: "ready", feed, symbols })}\n\n`);

  const clientId = hub.addClient(symbols, res);
  if (!clientId) {
    res.write(`event: stream-error\ndata: ${JSON.stringify({ error: "Unable to subscribe to requested symbols" })}\n\n`);
    res.end();
    return;
  }

  req.on("close", () => {
    hub.removeClient(clientId);
  });
});

router.get("/stock/:symbol/history", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (process.env.FMP_API_KEY) {
    try {
      const historyRaw = await fetchHistoricalFMP(symbol);
      if (!historyRaw) return res.status(404).json({ error: "History not found" });
      return res.json(normalizeHistory(historyRaw));
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch history" });
    }
  }

  if (!process.env.MASSIVE_API_KEY) {
    return res.status(400).json({ error: "No stock data provider configured" });
  }

  try {
    const to = Date.now();
    const from = to - 365 * 24 * 60 * 60 * 1000;
    const agg = await massiveService.getAggregates(symbol, 1, "day", from, to, { adjusted: true, sort: "asc" });
    const history = normalizeMassiveHistory(agg?.results || agg || []);
    if (!history.length) return res.status(404).json({ error: "History not found" });
    return res.json(history);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.get("/crypto/:id", async (req, res) => {
  try {
    const coin = await fetchCoinMarket(req.params.id);
    if (!coin) return res.status(404).json({ error: "Coin not found" });
    return res.json(coin);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch coin" });
  }
});

async function listTopCoins(limitInput, res) {
  try {
    const limit = Number(limitInput ?? 20);
    const coins = await fetchTopCoins(Math.min(Math.max(limit, 1), 250));
    return res.json(coins);
  } catch (err) {
    return res.json(generateMockTopCoins(Number(limitInput ?? 20)));
  }
}

router.get("/crypto/top", async (req, res) => {
  return listTopCoins(req.query.limit, res);
});

router.get("/crypto/top/:n", async (req, res) => {
  return listTopCoins(req.params.n, res);
});

export default router;
