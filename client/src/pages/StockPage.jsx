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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.15),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.12),transparent_45%)]" />
      <main className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={symbol ? symbol.toUpperCase() : "Stock Detail"}
        description="Real-time stock information and analysis"
        icon={TrendingUp}
        breadcrumb={<Breadcrumb />}
      />
      <div className="px-4 py-8 sm:px-6">
      {loading && <LoadingMessage />}
      {!loading && error && <ErrorMessage message={error} />}
      {!loading && !error && data && <StockDetail data={data} />}
      </div>
      </main>
    </div>
  );
}
