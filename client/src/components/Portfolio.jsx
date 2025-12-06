import React, { useEffect, useState } from "react";
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
    return <div className="bg-white p-4 rounded shadow">No portfolios yet.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((portfolio) => {
        const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
        return (
          <div key={portfolio._id} className="rounded bg-white p-4 shadow">
            <div className="flex justify-between">
              <div>
                <h3 className="font-semibold">{portfolio.name}</h3>
                <div className="text-sm text-gray-500">{holdings.length} holdings</div>
              </div>
              <div className="text-right">
                <PortfolioValueDisplay holdings={holdings} valueEntry={values[portfolio._id]} />
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {holdings.map((holding) => (
                <div key={holding.symbol} className="rounded border p-2">
                  <div className="font-semibold">{holding.symbol}</div>
                  <div className="text-sm">Qty: {holding.quantity}</div>
                  <div className="text-sm">Avg: {formatCurrency(holding.avgPrice)}</div>
                </div>
              ))}
            </div>
          </div>
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
  const plClass = profitLoss == null ? "text-gray-500" : profitLoss >= 0 ? "text-emerald-600" : "text-rose-600";

  return (
    <div className="space-y-0.5">
      <div className="font-bold">
        Value: {hasError ? (
          <span className="text-sm text-rose-600">{valueEntry.error}</span>
        ) : isValueReady ? (
          formatCurrency(value)
        ) : (
          <span className="text-sm text-gray-500">Loading…</span>
        )}
      </div>
      <div className={`text-sm ${plClass}`}>
        P/L: {profitLoss == null ? "—" : formatSignedCurrency(profitLoss)}
      </div>
      <div className="text-xs text-gray-400">Cost basis: {formatCurrency(costBasis)}</div>
    </div>
  );
}
