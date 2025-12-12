import mongoose from "mongoose";

const HoldingSchema = new mongoose.Schema({
  symbol: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 0 },
  avgPrice: { type: Number, default: 0 },
  purchaseDate: { type: Date, default: Date.now }
});

const PortfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: { type: String, required: true, trim: true },
  holdings: [HoldingSchema],
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Portfolio || mongoose.model("Portfolio", PortfolioSchema);
