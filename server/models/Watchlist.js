import mongoose from "mongoose";

const WatchlistSchema = new mongoose.Schema({
  symbol: String,
  name: String,
  price: Number,
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Watchlist", WatchlistSchema);
