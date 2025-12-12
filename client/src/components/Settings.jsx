import React, { useEffect, useState } from "react";
import { useToast } from "./Toast";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "LKR"];

function applyThemePreference(theme) {
  const root = document.documentElement;
  if (theme === "auto") {
    root.removeAttribute("data-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
  }
}

export default function Settings() {
  const toast = useToast();
  const [theme, setTheme] = useState(() => localStorage.getItem("pref-theme") || "auto");
  const [currency, setCurrency] = useState(() => localStorage.getItem("pref-currency") || "USD");
  const [stockLimit, setStockLimit] = useState(() => {
    const value = Number(localStorage.getItem("pref-stock-limit"));
    if (Number.isFinite(value) && value >= 50 && value <= 500) return value;
    return 100;
  });
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const value = Number(localStorage.getItem("pref-auto-refresh"));
    if (Number.isFinite(value) && value >= 5 && value <= 120) return value;
    return 30;
  });

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    const listener = (event) => {
      if (event.matches && theme === "auto") {
        applyThemePreference("auto");
      }
    };
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    if (mql.addEventListener) {
      mql.addEventListener("change", listener);
    } else if (mql.addListener) {
      mql.addListener(listener);
    }
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", listener);
      } else if (mql.removeListener) {
        mql.removeListener(listener);
      }
    };
  }, [theme]);

  const handleSave = () => {
    localStorage.setItem("pref-theme", theme);
    localStorage.setItem("pref-currency", currency);
    localStorage.setItem("pref-stock-limit", String(stockLimit));
    localStorage.setItem("pref-auto-refresh", String(autoRefresh));
    toast.success("StockDash preferences saved successfully");
    window.dispatchEvent(new CustomEvent("preferences:update", {
      detail: {
        theme,
        currency,
        stockLimit,
        autoRefresh
      }
    }));
  };

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Display</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase font-medium tracking-wider text-slate-600 dark:text-slate-400">Theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="auto">Auto (System)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase font-medium tracking-wider text-slate-600 dark:text-slate-400">Quote currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Data Preferences</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase font-medium tracking-wider text-slate-600 dark:text-slate-400">Stocks page fetch size</span>
            <input
              type="number"
              min={50}
              max={500}
              step={50}
              value={stockLimit}
              onChange={(e) => setStockLimit(Number(e.target.value) || 100)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">Applied on next refresh of the stocks directory (50-500)</span>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase font-medium tracking-wider text-slate-600 dark:text-slate-400">Dashboard auto-refresh (seconds)</span>
            <input
              type="number"
              min={5}
              max={120}
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(Number(e.target.value) || 30)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">Controls background polling for overview widgets (5-120 seconds)</span>
          </label>
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-700">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:shadow-lg hover:from-blue-700 hover:to-blue-800 active:scale-95"
        >
          Save preferences
        </button>
      </div>
    </div>
  );
}
