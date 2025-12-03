import mongoose from "mongoose";

const StockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  price: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

export default mongoose.model("Stock", StockSchema);
