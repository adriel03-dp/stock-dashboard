import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import stocksRoute from "./routes/stocks.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Routes
app.use("/api/stocks", stocksRoute);

app.get("/", (req, res) => {
  res.send("Stock Dashboard API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
