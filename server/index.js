import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import liveRoutes from "./routes/live.js";
import stocksRoutes from "./routes/stocks.js";
import watchlistRoutes from "./routes/watchlist.js";
import newsRoutes from "./routes/news.js";
import portfolioRoutes from "./routes/portfolio.js";
import marketRoutes from "./routes/market.js";
import authRoutes from "./routes/auth.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {});
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/stocks", stocksRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/market", marketRoutes);

app.get("/", (req, res) => res.json({ status: "API running" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
