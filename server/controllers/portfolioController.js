import Portfolio from "../models/Portfolio.js";
import { getStockQuote } from "../services/quoteService.js";

async function enrichPortfolioWithLivePrices(portfolio) {
  if (!portfolio.holdings || !portfolio.holdings.length) {
    return portfolio;
  }

  const enrichedPortfolio = portfolio.toObject ? portfolio.toObject() : JSON.parse(JSON.stringify(portfolio));
  
  enrichedPortfolio.holdings = await Promise.all(
    enrichedPortfolio.holdings.map(async (holding) => {
      try {
        const summary = await getStockQuote(holding.symbol);
        if (summary?.price != null) {
          return {
            ...holding,
            currentPrice: summary.price,
            change: summary.change,
            changePercent: summary.changePercent,
            currentValue: summary.price * holding.quantity,
            gainLoss: (summary.price * holding.quantity) - (holding.avgPrice * holding.quantity),
            quoteProvider: summary.provider,
            quoteUpdatedAt: summary.cachedAt,
            quoteIsStale: summary.isStale
          };
        }
      } catch (err) {
        console.warn(`Failed to fetch live price for ${holding.symbol}:`, err.message);
      }
      return holding;
    })
  );

  return enrichedPortfolio;
}

export const getPortfolios = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const portfolios = await Portfolio.find({ userId }).sort({ createdAt: -1 });
    
    // Enrich with live prices
    const enrichedPortfolios = await Promise.all(
      portfolios.map(p => enrichPortfolioWithLivePrices(p))
    );
    
    res.json(enrichedPortfolios);
  } catch (err) {
    console.error("Error fetching portfolios:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const createPortfolio = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Portfolio name is required" });
    }

    const portfolio = new Portfolio({
      userId,
      name: name.trim(),
      description: description || "",
      holdings: []
    });

    await portfolio.save();
    res.status(201).json(portfolio);
  } catch (err) {
    console.error("Error creating portfolio:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getPortfolioById = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    // Enrich with live prices
    const enrichedPortfolio = await enrichPortfolioWithLivePrices(portfolio);
    res.json(enrichedPortfolio);
  } catch (err) {
    console.error("Error fetching portfolio:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updatePortfolio = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, description } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Portfolio name is required" });
    }

    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, userId },
      { name: name.trim(), description: description || "", updatedAt: new Date() },
      { new: true }
    );

    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    // Enrich with live prices
    const enrichedPortfolio = await enrichPortfolioWithLivePrices(portfolio);
    res.json(enrichedPortfolio);
  } catch (err) {
    console.error("Error updating portfolio:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deletePortfolio = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const portfolio = await Portfolio.findOneAndDelete({
      _id: req.params.id,
      userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    res.json({ message: "Portfolio deleted successfully" });
  } catch (err) {
    console.error("Error deleting portfolio:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const addHolding = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const symbol = typeof req.body.symbol === "string" ? req.body.symbol.trim().toUpperCase() : "";
    const quantity = Number(req.body.quantity);
    const avgPrice = Number(req.body.avgPrice);

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(avgPrice) || avgPrice < 0 || req.body.avgPrice == null || req.body.avgPrice === "") {
      return res.status(400).json({ error: "Enter a symbol, a positive quantity, and a non-negative average price." });
    }

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    const existingHolding = portfolio.holdings.find(
      (h) => h.symbol.toUpperCase() === symbol.toUpperCase()
    );

    if (existingHolding) {
      const totalQuantity = existingHolding.quantity + quantity;
      existingHolding.avgPrice = (existingHolding.avgPrice * existingHolding.quantity + avgPrice * quantity) / totalQuantity;
      existingHolding.quantity = totalQuantity;
    } else {
      portfolio.holdings.push({ symbol, quantity, avgPrice, purchaseDate: new Date() });
    }

    portfolio.updatedAt = new Date();
    await portfolio.save();

    res.json(portfolio);
  } catch (err) {
    console.error("Error adding holding:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const removeHolding = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const holdingSymbol = typeof req.body.holdingSymbol === "string"
      ? req.body.holdingSymbol.trim().toUpperCase()
      : "";

    if (!holdingSymbol) {
      return res.status(400).json({ error: "Holding symbol is required" });
    }

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    portfolio.holdings = portfolio.holdings.filter(
      (h) => h.symbol.toUpperCase() !== holdingSymbol
    );

    portfolio.updatedAt = new Date();
    await portfolio.save();

    res.json(portfolio);
  } catch (err) {
    console.error("Error removing holding:", err);
    res.status(500).json({ error: "Server error" });
  }
};
