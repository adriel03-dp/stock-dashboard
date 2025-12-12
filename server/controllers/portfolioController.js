import Portfolio from "../models/Portfolio.js";
import jwt from "jsonwebtoken";

const getUserIdFromToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    return decoded.id;
  } catch (err) {
    return null;
  }
};

export const getPortfolios = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const portfolios = await Portfolio.find({ userId }).sort({ createdAt: -1 });
    res.json(portfolios);
  } catch (err) {
    console.error("Error fetching portfolios:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const createPortfolio = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Portfolio name is required" });
    }

    const portfolio = new Portfolio({
      userId,
      name,
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
    const token = req.headers.authorization?.split(" ")[1];
    const userId = getUserIdFromToken(token);

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

    res.json(portfolio);
  } catch (err) {
    console.error("Error fetching portfolio:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updatePortfolio = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, description } = req.body;

    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, userId },
      { name, description, updatedAt: new Date() },
      { new: true }
    );

    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    res.json(portfolio);
  } catch (err) {
    console.error("Error updating portfolio:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deletePortfolio = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const userId = getUserIdFromToken(token);

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
    const token = req.headers.authorization?.split(" ")[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { symbol, quantity, avgPrice } = req.body;

    if (!symbol || !quantity || !avgPrice) {
      return res.status(400).json({ error: "All fields required" });
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
      existingHolding.quantity += quantity;
      existingHolding.avgPrice = (existingHolding.avgPrice + avgPrice) / 2;
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
    const token = req.headers.authorization?.split(" ")[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { holdingSymbol } = req.body;

    const portfolio = await Portfolio.findOne({
      _id: req.params.id,
      userId
    });

    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }

    portfolio.holdings = portfolio.holdings.filter(
      (h) => h.symbol.toUpperCase() !== holdingSymbol.toUpperCase()
    );

    portfolio.updatedAt = new Date();
    await portfolio.save();

    res.json(portfolio);
  } catch (err) {
    console.error("Error removing holding:", err);
    res.status(500).json({ error: "Server error" });
  }
};
