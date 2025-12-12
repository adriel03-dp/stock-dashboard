import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

const formatValue = (value) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (Math.abs(value) >= 1_000_000_000_000) {
      return `${(value / 1_000_000_000_000).toFixed(1)}T`;
    }
    if (Math.abs(value) >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
  }
  return value;
};

const formatPercent = (value) => {
  if (value === null || value === undefined) return "—";
  return `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
};

export default function MarketMetricCard({ title, value, change, subtitle, tone = "neutral" }) {
  const isPositive = Number(change) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/30 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none sm:p-5"
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</div>
        {change !== undefined && change !== null && (
          <motion.div
            layout
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-inner ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
            }`}
          >
            {isPositive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {formatPercent(change)}
          </motion.div>
        )}
      </div>

      <div className="text-2xl font-semibold text-slate-900 dark:text-white">{formatValue(value)}</div>
      {subtitle && <div className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}

      {tone === "highlight" && (
        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Markets open · Tracking live movement</div>
      )}
    </motion.div>
  );
}
