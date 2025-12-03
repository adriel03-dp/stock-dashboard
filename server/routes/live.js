import express from "express";
import { fetchStockPrice } from "../services/fetchStockPrice.js";

const router = express.Router();

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const data = await fetchStockPrice(symbol);

  if (!data) return res.status(500).json({ error: "Failed to fetch price" });

  res.json(data);
});

export default router;
