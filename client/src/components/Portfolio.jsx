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
  if (value == null) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return currencyFormatter.format(numeric);
}

function formatSignedCurrency(value) {
  if (value == null) return "—";
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

export default function Portfolio({ items = [], onUpdated }) {
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
        value: holdings.every(h => h.currentPrice != null && Number.isFinite(Number(h.currentPrice))) ? totalValue : null
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
            <HoldingForm portfolioId={portfolio._id} onUpdated={onUpdated}/>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {holdings.map((holding) => {
                const currentPrice = holding.currentPrice != null && Number.isFinite(Number(holding.currentPrice)) ? Number(holding.currentPrice) : null;
                const avgPrice = Number(holding.avgPrice) || 0;
                const quantity = Number(holding.quantity) || 0;
                const currentValue = currentPrice == null ? null : currentPrice * quantity;
                const costValue = avgPrice * quantity;
                const gainLoss = currentValue == null ? null : currentValue - costValue;
                const gainLossPercent = gainLoss != null && costValue > 0 ? (gainLoss / costValue) * 100 : null;
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
                          {gainLossPercent == null ? "Quote unavailable" : `${isPositive ? "+" : ""}${gainLossPercent.toFixed(2)}%`}
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
      {!isValueReady && <p className="text-xs text-slate-500">Valuation unavailable: one or more quotes are missing.</p>}
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

function HoldingForm({portfolioId, onUpdated}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({symbol:'',quantity:'',avgPrice:''});
  async function submit(e) {
    e.preventDefault(); if(busy) return; setBusy(true); setError('');
    try {
      await api.post('/portfolio/' + portfolioId + '/holdings', {symbol:form.symbol.trim().toUpperCase(),quantity:Number(form.quantity),avgPrice:Number(form.avgPrice)});
      setForm({symbol:'',quantity:'',avgPrice:''}); setOpen(false); onUpdated?.();
    } catch(err) {setError(err.response?.data?.error || 'Could not save holding. Please try again.');}
    finally {setBusy(false);}
  }
  return <div className="mt-4"><button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:text-slate-200" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Close holding form' : 'Add holding'}</button>{open && <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">{[['symbol','Stock symbol','text'],['quantity','Quantity','number'],['avgPrice','Average purchase price (USD)','number']].map(([key,label,type]) => <label key={key} className="text-xs text-slate-600 dark:text-slate-300">{label}<input required type={type} min={key === 'quantity' ? '0.000001' : '0'} step="any" value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})} className="mt-1 block w-44 rounded border border-slate-300 bg-white p-2 text-slate-900"/></label>)}<button disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">{busy ? 'Saving…' : 'Save holding'}</button>{error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}</form>}</div>;
}
