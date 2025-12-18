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
import newsStreamingService from "./services/newsStreamingService.js";
import FinnhubNewsService from "./services/finnhubNewsService.js";

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
const server = app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  
  // Start real-time news streaming service
  console.log("🚀 Starting real-time news streaming service...");
  newsStreamingService.start();

  // Initialize and optionally start Finnhub service
  if (process.env.FINNHUB_API_KEY) {
    console.log("🔴 Finnhub API key detected, service will start on first client connection");
    // Finnhub service is lazily initialized in routes, starts on first client connection
  } else {
    console.log("⚠️ FINNHUB_API_KEY not configured, Finnhub news service unavailable");
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  newsStreamingService.stop();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
