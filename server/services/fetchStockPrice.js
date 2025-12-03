import axios from "axios";

export const fetchStockPrice = async (symbol) => {
  try {
    const apiKey = process.env.FMP_API_KEY;

    const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`;

    const res = await axios.get(url);
    return res.data[0]; // returns {symbol, price, ...}
  } catch (err) {
    console.error("Stock API error:", err);
    return null;
  }
};
