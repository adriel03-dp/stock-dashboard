import { useEffect, useState } from "react";
import { api } from "../utils/api";

export default function LiveStockCard({ symbol }) {
  const [data, setData] = useState(null);

  const fetchPrice = () => {
    api.get(`/live/${symbol}`).then((res) => setData(res.data));
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 5000); // refresh every 5 sec
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="stock-card">
      <h2>{data.symbol}</h2>
      <p style={{ fontSize: 24, fontWeight: "bold" }}>${data.price}</p>
      <p>{new Date().toLocaleTimeString()}</p>
    </div>
  );
}
