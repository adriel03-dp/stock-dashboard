import express from "express";
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
