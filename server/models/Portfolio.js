import mongoose from "mongoose";

const HoldingSchema = new mongoose.Schema({
  symbol: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 0 },
  avgPrice: { type: Number, default: 0 }
});

const PortfolioSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  holdings: [HoldingSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Portfolio || mongoose.model("Portfolio", PortfolioSchema);
