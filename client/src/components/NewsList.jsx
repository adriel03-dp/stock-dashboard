import React from "react";
import { motion } from "framer-motion";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeTimeFormatter.format(diffDays, "day");
}

export default function NewsList({ items = [] }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
        No news headlines available right now.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {items.map((article, index) => {
        const key = article.id || article.url || index;
        const relativeTime = formatRelativeTime(article.publishedAt);
        return (
          <motion.a
            key={key}
            href={article.url || "#"}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="block overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-md shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none backdrop-blur-sm"
          >
            <div className="flex gap-3">
              {article.image && (
                <img
                  src={article.image}
                  alt=""
                  className="h-24 w-32 rounded-xl object-cover"
                  loading="lazy"
                />
              )}
              <div className="flex-1">
                <div className="text-base font-semibold text-slate-900 dark:text-white">{article.title}</div>
                <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {article.source || "Unknown source"}
                  {relativeTime && ` • ${relativeTime}`}
                </div>
                {article.description && (
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{article.description}</div>
                )}
                {article.tickers && article.tickers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 text-xs">
                    {article.tickers.map((ticker) => (
                      <span key={ticker} className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {ticker}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.a>
        );
      })}
    </div>
  );
}
