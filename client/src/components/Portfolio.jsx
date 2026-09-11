import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Trash2, X } from "lucide-react";
import StockSymbolCombobox from "./StockSymbolCombobox";
import { useToast } from "./Toast";

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
  const toast = useToast();
  const [values, setValues] = useState({});
  const [busyAction, setBusyAction] = useState("");

  async function deletePortfolio(portfolio) {
    if (!window.confirm(`Delete “${portfolio.name}” and all of its holdings?`)) return;
    setBusyAction(`portfolio:${portfolio._id}`);
    try {
      await api.delete(`/portfolio/${portfolio._id}`);
      toast.success(`Portfolio “${portfolio.name}” deleted`);
      onUpdated?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Could not delete portfolio");
    } finally {
      setBusyAction("");
    }
  }

  async function deleteHolding(portfolioId, symbol) {
    if (!window.confirm(`Remove ${symbol} from this portfolio?`)) return;
    setBusyAction(`holding:${portfolioId}:${symbol}`);
    try {
      await api.delete(`/portfolio/${portfolioId}/holdings`, { data: { holdingSymbol: symbol } });
      toast.success(`${symbol} removed from portfolio`);
      onUpdated?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Could not remove holding");
    } finally {
      setBusyAction("");
    }
  }

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
                <button
                  type="button"
                  onClick={() => deletePortfolio(portfolio)}
                  disabled={busyAction === `portfolio:${portfolio._id}`}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  aria-label={`Delete ${portfolio.name} portfolio`}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Delete portfolio
                </button>
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
                        <span className={`font-medium ${isPositive == null ? "text-slate-500 dark:text-slate-400" : isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {formatSignedCurrency(gainLoss)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteHolding(portfolio._id, holding.symbol)}
                        disabled={busyAction === `holding:${portfolio._id}:${holding.symbol}`}
                        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        Remove holding
                      </button>
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
  const [form, setForm] = useState({stock:null,quantity:'',avgPrice:''});
  async function submit(e) {
    e.preventDefault();
    if(busy) return;
    if (!form.stock?.symbol) {
      setError('Select a stock from the suggestions.');
      return;
    }
    setBusy(true); setError('');
    try {
      await api.post('/portfolio/' + portfolioId + '/holdings', {symbol:form.stock.symbol,quantity:Number(form.quantity),avgPrice:Number(form.avgPrice)});
      setForm({stock:null,quantity:'',avgPrice:''}); setOpen(false); onUpdated?.();
    } catch(err) {setError(err.response?.data?.error || 'Could not save holding. Please try again.');}
    finally {setBusy(false);}
  }
  return (
    <div className="mt-4">
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? <X aria-hidden="true" className="h-4 w-4" /> : <Plus aria-hidden="true" className="h-4 w-4" />}
        {open ? 'Close form' : 'Add holding'}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          {error && <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_220px_auto] md:items-end">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Stock
              <div className="mt-1"><StockSymbolCombobox value={form.stock} onChange={(stock) => setForm({...form, stock})} disabled={busy} /></div>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Quantity purchased
              <input required type="number" min="0.000001" step="any" value={form.quantity} onChange={e => setForm({...form,quantity:e.target.value})} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"/>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Average purchase price (USD)
              <input required type="number" min="0" step="any" value={form.avgPrice} onChange={e => setForm({...form,avgPrice:e.target.value})} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"/>
            </label>
            <button disabled={busy} className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save holding'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
