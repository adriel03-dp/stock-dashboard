import express from "express";
import authMiddleware from "../middleware/auth.js";
import {
  getPortfolios,
  createPortfolio,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  addHolding,
  removeHolding
} from "../controllers/portfolioController.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// User portfolios
router.get("/", getPortfolios);
router.post("/", createPortfolio);
router.get("/:id", getPortfolioById);
router.put("/:id", updatePortfolio);
router.delete("/:id", deletePortfolio);

// Holdings management
router.post("/:id/holdings", addHolding);
router.delete("/:id/holdings", removeHolding);

export default router;
