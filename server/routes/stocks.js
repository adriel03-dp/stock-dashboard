import express from "express";
import axios from "axios";
import Watchlist from "../models/Watchlist.js";

const router = express.Router();

// Fetch live crypto prices
router.get("/crypto", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/markets",
      {
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 50,
          page: 1,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching crypto data" });
  }
});

// Add item to watchlist
router.post("/watchlist", async (req, res) => {
  try {
    const item = new Watchlist(req.body);
    await item.save();
    res.json({ message: "Added to watchlist" });
  } catch (err) {
    res.status(400).json({ error: "Could not save" });
  }
});

// Get watchlist
router.get("/watchlist", async (req, res) => {
  const items = await Watchlist.find();
  res.json(items);
});

export default router;
