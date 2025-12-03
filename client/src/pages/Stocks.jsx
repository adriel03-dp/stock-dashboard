import { useEffect, useState } from "react";
import { api } from "../utils/api";

export default function Stocks() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    api.get("/stocks").then(res => setStocks(res.data));
  }, []);

  return (
    <div>
      <h1>Stock Prices</h1>
      <ul>
        {stocks.map(stock => (
          <li key={stock._id}>
            {stock.symbol} - ${stock.price}
          </li>
        ))}
      </ul>
    </div>
  );
}
