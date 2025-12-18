import express from "express";
import authMiddleware from "../middleware/auth.js";
import WatchItem from "../models/WatchItem.js";
import { fetchCoinMarket } from "../services/binanceService.js";
import { fetchMassiveStockSummary } from "../utils/stockData.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.post("/", async (req, res) => {
  try {
    const { symbol, name, lastPrice, type = "stock" } = req.body;
    if (!symbol) return res.status(400).json({ error: "symbol is required" });

    const normalizedType = type === "crypto" ? "crypto" : "stock";
    const trimmed = symbol.trim();
    const normalizedSymbol = trimmed.toUpperCase();

    const existing = await WatchItem.findOne({ symbol: normalizedSymbol, type: normalizedType });
    if (existing) return res.status(409).json({ error: "Item already in watchlist" });

    let resolvedName = name;
    let price = lastPrice ?? null;
    let externalId = normalizedSymbol;
    const coinData = normalizedType === "crypto" ? await fetchCoinMarket(trimmed.toLowerCase()) : null;

    if (normalizedType === "stock" && process.env.MASSIVE_API_KEY) {
      const summary = await fetchMassiveStockSummary(normalizedSymbol);
      if (summary) {
        if (price == null && summary.price != null) price = summary.price;
        if (!resolvedName && summary.name) resolvedName = summary.name;
      }
    }

    if (normalizedType === "crypto") {
      if (price == null) price = coinData?.current_price ?? null;
      if (!resolvedName) resolvedName = coinData?.name ?? null;
      externalId = coinData?.id ?? trimmed.toLowerCase();
    }

    if (!resolvedName) resolvedName = normalizedSymbol;

    const item = await WatchItem.create({
      symbol: normalizedSymbol,
      name: resolvedName,
      lastPrice: price,
      type: normalizedType,
      externalId
    });
    res.status(201).json(item);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: "Item already in watchlist" });
    res.status(400).json({ error: "Invalid data", details: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type === "crypto" ? "crypto" : "stock";
    const items = await WatchItem.find(filter).sort({ addedAt: -1 });
    
    // Enrich stocks with live prices from Massive API
    if (process.env.MASSIVE_API_KEY) {
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const itemObj = item.toObject();
          if (item.type === "stock") {
            try {
              const summary = await fetchMassiveStockSummary(item.symbol);
              if (summary?.price != null) {
                itemObj.lastPrice = summary.price;
                itemObj.liveData = summary;
              }
            } catch (err) {
              // Keep cached price if API fails
              console.warn(`Failed to fetch live price for ${item.symbol}:`, err.message);
            }
          } else if (item.type === "crypto") {
            try {
              const coin = await fetchCoinMarket((item.externalId || item.symbol || "").toLowerCase());
              if (coin?.current_price != null) {
                itemObj.lastPrice = coin.current_price;
              }
            } catch (err) {
              console.warn(`Failed to fetch live crypto price for ${item.symbol}:`, err.message);
            }
          }
          return itemObj;
        })
      );
      return res.json(enrichedItems);
    }
    
    res.json(items);
  } catch (err) {
    console.error("Watchlist error:", err);
    res.status(500).json({ error: "Failed to load watchlist" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await WatchItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove item" });
  }
});

router.patch("/:id/refresh", async (req, res) => {
  try {
    const item = await WatchItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });

    if (item.type === "stock" && process.env.MASSIVE_API_KEY) {
      const summary = await fetchMassiveStockSummary(item.symbol);
      if (summary?.price != null) item.lastPrice = summary.price;
    } else if (item.type === "crypto") {
      try {
        const coin = await fetchCoinMarket((item.externalId || item.symbol || "").toLowerCase());
        if (coin?.current_price != null) item.lastPrice = coin.current_price;
      } catch (e) {
        /* ignore */
      }
    }
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to refresh" });
  }
});

export default router;
