import Stock from "../models/Stock.js";
import { massiveService } from "../services/massiveService.js";
import { generateMockStocks } from "../services/mockData.js";

// GET /api/stocks - Get trending stocks (live data)
export const getStocks = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

    // Try to fetch live data from Massive
    if (process.env.MASSIVE_API_KEY) {
      try {
        const data = await massiveService.searchTickers({
          limit,
          sort: "change",
          order: "desc",
        });

        if (data?.results && Array.isArray(data.results)) {
          const stocks = data.results.slice(0, limit).map((ticker) => ({
            symbol: ticker.ticker,
            name: ticker.name || ticker.company_name || ticker.ticker,
            price: ticker.last_quote?.last_updated_utc ? null : 0,
            change: ticker.last_quote?.last_updated_utc ? null : 0,
            changePercent: ticker.last_quote?.last_updated_utc ? null : 0,
            volume: ticker.volume || 0,
            marketCap: ticker.market_cap || null,
            sector: ticker.sic_description || null,
            country: ticker.locale || null,
          }));
          return res.json(stocks);
        }
      } catch (err) {
        console.warn("Failed to fetch from Massive API:", err.message);
        // Fall through to mock data
      }
    }

    // Fallback to mock data
    const mockStocks = generateMockStocks(limit);
    res.json(mockStocks);
  } catch (err) {
    console.error("Error fetching stocks:", err.message);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
};

// POST /api/stocks - Add stock to database
export const addStock = async (req, res) => {
  try {
    const { symbol, price } = req.body;
    if (!symbol) return res.status(400).json({ error: "Symbol is required" });

    const stock = await Stock.create({ 
      symbol: symbol.toUpperCase(), 
      price: price || 0,
      date: new Date()
    });
    res.status(201).json(stock);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Stock already exists" });
    }
    res.status(400).json({ error: "Invalid data", details: err.message });
  }
};
