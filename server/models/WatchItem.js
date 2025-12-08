import mongoose from "mongoose";

const WatchItemSchema = new mongoose.Schema({
  symbol: { type: String, required: true, trim: true },
  name: { type: String, trim: true },
  lastPrice: Number,
  type: { type: String, default: "stock", enum: ["stock", "crypto"] },
  externalId: { type: String, trim: true },
  addedAt: { type: Date, default: Date.now }
});

WatchItemSchema.index({ symbol: 1, type: 1 }, { unique: true });

export default mongoose.models.WatchItem || mongoose.model("WatchItem", WatchItemSchema);
