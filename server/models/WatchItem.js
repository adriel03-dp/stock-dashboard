import mongoose from "mongoose";

const WatchItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  symbol: { type: String, required: true, trim: true },
  name: { type: String, trim: true },
  lastPrice: Number,
  lastPriceAt: Date,
  lastProvider: { type: String, trim: true },
  type: { type: String, default: "stock", enum: ["stock", "crypto"] },
  externalId: { type: String, trim: true },
  addedAt: { type: Date, default: Date.now }
});

WatchItemSchema.index({ userId: 1, symbol: 1, type: 1 }, { unique: true });

export default mongoose.models.WatchItem || mongoose.model("WatchItem", WatchItemSchema);
