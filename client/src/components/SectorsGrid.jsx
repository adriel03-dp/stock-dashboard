import React from "react";
import { motion } from "framer-motion";

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

function formatPercent(value) {
  if (value == null) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numberFormatter.format(numeric);
}

export default function SectorsGrid({ sectors = [], selected, onSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sectors.map((sector) => {
        const isSelected = selected === sector.name;
        const changePositive = Number(sector.changePercent) >= 0;
        return (
          <motion.button
            key={sector.name}
            type="button"
            onClick={() => onSelect?.(sector.name)}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`rounded-2xl border p-5 text-left transition-all shadow-sm focus:outline-none focus-visible:ring-2 ${
              isSelected
                ? "border-blue-500 bg-gradient-to-br from-blue-500/10 via-blue-100/60 to-blue-50/80 shadow-blue-200/40 dark:border-blue-400 dark:from-blue-900/40 dark:via-blue-800/30 dark:to-blue-900/20 dark:shadow-blue-900/40"
                : "border-slate-200 bg-white shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40"
            } focus-visible:ring-blue-200 dark:focus-visible:ring-blue-800`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Sector</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">{sector.name}</div>
              </div>
              <div className={`text-sm font-semibold ${changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {formatPercent(sector.changePercent)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Market Cap</div>
                <div className="font-medium text-slate-900 dark:text-white">{formatNumber(sector.totalMarketCap)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Volume</div>
                <div className="font-medium text-slate-900 dark:text-white">{formatNumber(sector.totalVolume)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Advancers</div>
                <div className="font-medium text-emerald-600 dark:text-emerald-400">{sector.advancers}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Decliners</div>
                <div className="font-medium text-rose-600 dark:text-rose-400">{sector.decliners}</div>
              </div>
            </div>
            <div className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">Tap to view top movers</div>
          </motion.button>
        );
      })}
    </div>
  );
}
