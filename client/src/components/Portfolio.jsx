import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

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
  const { token } = useAuth();
  const [values, setValues] = useState({});

  useEffect(() => {
    let cancelled = false;

    if (!items.length) {
      setValues({});
      return () => {
        cancelled = true;
      };
    }

    // Calculate portfolio values from the live prices returned by the API
    const next = {};
    items.forEach((portfolio) => {
      if (!portfolio?._id) return;
      const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
      
      // Calculate total current value from holdings with live prices
      let totalValue = 0;
      holdings.forEach((holding) => {
        const currentPrice = Number(holding.currentPrice) || 0;
        const quantity = Number(holding.quantity) || 0;
        totalValue += currentPrice * quantity;
      });

      next[portfolio._id] = {
        value: totalValue > 0 ? totalValue : null
      };
    });

    if (!cancelled) setValues(next);

    return () => {
      cancelled = true;
    };
  }, [items, token]);

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
              {holdings.map((holding) => {
                const currentPrice = Number(holding.currentPrice) || Number(holding.lastPrice) || 0;
                const avgPrice = Number(holding.avgPrice) || 0;
                const quantity = Number(holding.quantity) || 0;
                const currentValue = currentPrice * quantity;
                const costValue = avgPrice * quantity;
                const gainLoss = currentValue - costValue;
                const gainLossPercent = costValue > 0 ? (gainLoss / costValue) * 100 : 0;
                const isPositive = gainLoss >= 0;

                return (
                  <motion.div
                    key={holding.symbol}
                    whileHover={{ y: -3 }}
                    className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{holding.symbol}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Qty: {quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(currentPrice)}
                        </div>
                        <div className={`text-xs font-medium ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isPositive ? "+" : ""}{gainLossPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-slate-200/50 pt-2 dark:border-slate-600/50">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Avg Cost:</span>
                        <span className="text-slate-900 dark:text-white font-medium">{formatCurrency(avgPrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-slate-500 dark:text-slate-400">Total Value:</span>
                        <span className="text-slate-900 dark:text-white font-medium">{formatCurrency(currentValue)}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-slate-500 dark:text-slate-400">P/L:</span>
                        <span className={`font-medium ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {formatSignedCurrency(gainLoss)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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

  return (
    <div className="space-y-1 text-right">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Cost basis: {formatCurrency(costBasis)}
      </div>
      {isValueReady && (
        <>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            Value: {formatCurrency(value)}
          </div>
          <div className={`text-xs font-semibold ${value >= costBasis ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            P/L: {formatSignedCurrency(value - costBasis)}
          </div>
        </>
      )}
    </div>
  );
}
