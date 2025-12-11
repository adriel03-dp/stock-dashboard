import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../utils/api";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return currencyFormatter.format(numeric);
}

function formatSignedCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  const absolute = currencyFormatter.format(Math.abs(numeric));
  return `${numeric >= 0 ? "+" : "-"}${absolute}`;
}

function calculateCostBasis(holdings = []) {
  return holdings.reduce((total, holding) => {
    const quantity = Number(holding.quantity);
    const avgPrice = Number(holding.avgPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(avgPrice)) return total;
    return total + quantity * avgPrice;
  }, 0);
}

export default function Portfolio({ items = [] }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    let cancelled = false;

    if (!items.length) {
      setValues({});
      return () => {
        cancelled = true;
      };
    }

    async function loadValues() {
      const next = {};
      await Promise.all(
        items.map(async (portfolio) => {
          if (!portfolio?._id) return;
          try {
            const { data } = await api.get(`/portfolio/${portfolio._id}/value`);
            const value = Number(data?.value);
            next[portfolio._id] = {
              value: Number.isFinite(value) ? value : null
            };
          } catch (err) {
            next[portfolio._id] = {
              error: err?.response?.data?.error || "Failed to load value"
            };
          }
        })
      );

      if (!cancelled) setValues(next);
    }

    loadValues();

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
        Create your first portfolio to start tracking performance.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((portfolio) => {
        const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
        return (
          <motion.div
            key={portfolio._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{portfolio.name}</h3>
                <div className="text-sm text-slate-500 dark:text-slate-400">{holdings.length} holdings</div>
              </div>
              <div className="text-right">
                <PortfolioValueDisplay holdings={holdings} valueEntry={values[portfolio._id]} />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {holdings.map((holding) => (
                <motion.div
                  key={holding.symbol}
                  whileHover={{ y: -3 }}
                  className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{holding.symbol}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Qty • {holding.quantity}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Avg • {formatCurrency(holding.avgPrice)}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PortfolioValueDisplay({ holdings = [], valueEntry }) {
  const costBasis = calculateCostBasis(holdings);
  const hasError = Boolean(valueEntry?.error);
  const value = valueEntry?.value;
  const isValueReady = value != null && !Number.isNaN(value);
  const profitLoss = isValueReady ? value - costBasis : null;
  const plClass = profitLoss == null ? "text-slate-500 dark:text-slate-400" : profitLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";

  return (
    <div className="space-y-1 text-right">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">
        Value: {hasError ? (
          <span className="text-sm text-rose-600 dark:text-rose-400">{valueEntry.error}</span>
        ) : isValueReady ? (
          formatCurrency(value)
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading…</span>
        )}
      </div>
      <div className={`text-xs font-semibold ${plClass}`}>
        P/L: {profitLoss == null ? "—" : formatSignedCurrency(profitLoss)}
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-600">Cost basis: {formatCurrency(costBasis)}</div>
    </div>
  );
}
