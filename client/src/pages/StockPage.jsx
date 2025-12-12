import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import StockDetail from "../components/StockDetail";
import { LoadingMessage, ErrorMessage } from "../components/SkeletonLoaders";
import { api } from "../utils/api";

export default function StockPage() {
  const { symbol } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const target = String(symbol || "").toUpperCase();
        const { data: response } = await api.get(`/stocks/${encodeURIComponent(target)}`);
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load stock detail", err);
          setError(err?.response?.data?.error || "Unable to load stock");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader
        title={symbol ? symbol.toUpperCase() : "Stock Detail"}
        description="Real-time stock information and analysis"
        icon={TrendingUp}
        breadcrumb={<Breadcrumb />}
      />
      {loading && <LoadingMessage />}
      {!loading && error && <ErrorMessage message={error} />}
      {!loading && !error && data && <StockDetail data={data} />}
    </div>
  );
}
