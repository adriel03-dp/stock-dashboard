import express from "express";
import Portfolio from "../models/Portfolio.js";
import { fetchMassiveStockSummary } from "../utils/stockData.js";

const router = express.Router();

function normalizeHoldings(holdings = []) {
  if (!Array.isArray(holdings)) return [];
  return holdings.map((h) => ({
    symbol: h.symbol?.trim().toUpperCase() ?? "",
    quantity: Number(h.quantity ?? 0),
    avgPrice: Number(h.avgPrice ?? 0)
  }));
}

router.post("/", async (req, res) => {
  try {
    const payload = { ...req.body, holdings: normalizeHoldings(req.body.holdings) };
    const p = new Portfolio(payload);
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const items = await Portfolio.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to load portfolios" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const p = await Portfolio.findById(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.holdings) payload.holdings = normalizeHoldings(payload.holdings);
    const p = await Portfolio.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Portfolio.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete portfolio" });
  }
});

router.get("/:id/value", async (req, res) => {
  try {
    const p = await Portfolio.findById(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });

    let total = 0;
    for (const h of p.holdings) {
      let price = h.avgPrice ?? 0;
      if (process.env.MASSIVE_API_KEY) {
        const summary = await fetchMassiveStockSummary(h.symbol);
        if (summary?.price != null) price = summary.price;
      }
      total += price * (h.quantity ?? 0);
    }
    res.json({ value: total });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute value" });
  }
});

export default router;
