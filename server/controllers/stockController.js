import Stock from "../models/Stock.js";

// GET /api/stocks
export const getStocks = async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ date: -1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/stocks
export const addStock = async (req, res) => {
  try {
    const { symbol, price } = req.body;
    const stock = await Stock.create({ symbol, price });
    res.json(stock);
  } catch (err) {
    res.status(400).json({ error: "Invalid data" });
  }
};
