import express from "express";
import authMiddleware from "../middleware/auth.js";
import WatchItem from "../models/WatchItem.js";
import { fetchCoinMarket } from "../services/binanceService.js";
import { getStockQuote } from "../services/quoteService.js";

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

    const existing = await WatchItem.findOne({
      userId: req.userId,
      symbol: normalizedSymbol,
      type: normalizedType
    });
    if (existing) return res.status(409).json({ error: "Item already in watchlist" });

    let resolvedName = name;
    let price = lastPrice ?? null;
    let externalId = normalizedSymbol;
    const coinData = normalizedType === "crypto" ? await fetchCoinMarket(trimmed.toLowerCase()) : null;

    let stockQuote = null;
    if (normalizedType === "stock") {
      try {
        stockQuote = await getStockQuote(normalizedSymbol);
        if (price == null && stockQuote?.price != null) price = stockQuote.price;
        if (!resolvedName && stockQuote?.name) resolvedName = stockQuote.name;
      } catch (error) {
        // A watch item can still be saved; its quote will be retried later.
      }
    }

    if (normalizedType === "crypto") {
      if (price == null) price = coinData?.current_price ?? null;
      if (!resolvedName) resolvedName = coinData?.name ?? null;
      externalId = coinData?.id ?? trimmed.toLowerCase();
    }

    if (!resolvedName) resolvedName = normalizedSymbol;

    const item = await WatchItem.create({
      userId: req.userId,
      symbol: normalizedSymbol,
      name: resolvedName,
      lastPrice: price,
      lastPriceAt: stockQuote?.cachedAt ? new Date(stockQuote.cachedAt) : (price != null ? new Date() : null),
      lastProvider: stockQuote?.provider || null,
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
    const filter = { userId: req.userId };
    if (req.query.type) filter.type = req.query.type === "crypto" ? "crypto" : "stock";
    const items = await WatchItem.find(filter).sort({ addedAt: -1 });
    
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const itemObj = item.toObject();
        try {
          if (item.type === "stock") {
            const quote = await getStockQuote(item.symbol);
            if (quote?.price != null) {
              itemObj.lastPrice = quote.price;
              itemObj.lastPriceAt = quote.cachedAt;
              itemObj.lastProvider = quote.provider;
              itemObj.isStale = quote.isStale;
              itemObj.liveData = quote;

              const quoteAt = new Date(quote.cachedAt);
              if (!item.lastPriceAt || quoteAt > item.lastPriceAt) {
                await WatchItem.updateOne(
                  { _id: item._id, userId: req.userId },
                  { lastPrice: quote.price, lastPriceAt: quoteAt, lastProvider: quote.provider }
                );
              }
            }
          } else if (item.type === "crypto") {
            const coin = await fetchCoinMarket((item.externalId || item.symbol || "").toLowerCase());
            if (coin?.current_price != null) itemObj.lastPrice = coin.current_price;
          }
        } catch (err) {
          // Keep the last persisted price if every live provider is unavailable.
          itemObj.isStale = true;
          console.warn(`Failed to refresh ${item.symbol}:`, err.message);
        }
        return itemObj;
      })
    );

    res.json(enrichedItems);
  } catch (err) {
    console.error("Watchlist error:", err);
    res.status(500).json({ error: "Failed to load watchlist" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await WatchItem.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove item" });
  }
});

router.patch("/:id/refresh", async (req, res) => {
  try {
    const item = await WatchItem.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: "Not found" });

    let refreshedQuote = null;
    if (item.type === "stock") {
      refreshedQuote = await getStockQuote(item.symbol, { forceRefresh: true });
      if (refreshedQuote?.price != null) {
        item.lastPrice = refreshedQuote.price;
        item.lastPriceAt = new Date(refreshedQuote.cachedAt);
        item.lastProvider = refreshedQuote.provider;
      }
    } else if (item.type === "crypto") {
      try {
        const coin = await fetchCoinMarket((item.externalId || item.symbol || "").toLowerCase());
        if (coin?.current_price != null) item.lastPrice = coin.current_price;
      } catch (e) {
        /* ignore */
      }
    }
    await item.save();
    const result = item.toObject();
    result.isStale = Boolean(refreshedQuote?.isStale);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to refresh" });
  }
});

export default router;
