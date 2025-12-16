import React, { useState } from "react";
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
  const [logoCurrentIndex, setLogoCurrentIndex] = useState({});

  const handleLogoError = (index) => {
    setLogoCurrentIndex(prev => {
      const current = prev[index] || 0;
      const nextIndex = current + 1;
      return { ...prev, [index]: nextIndex };
    });
  };

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
        const currentLogoIndex = logoCurrentIndex[index] || 0;
        
        // Handle both string and array logo sources
        const logoSources = Array.isArray(article.sourceLogo) ? article.sourceLogo : [article.sourceLogo];
        const currentLogo = logoSources[currentLogoIndex];
        const hasMoreLogos = currentLogoIndex < logoSources.length - 1;
        
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
            <div className="flex gap-4">
              {/* Source Logo on Left */}
              <div className="h-24 w-28 rounded-lg flex-shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600">
                {currentLogo ? (
                  <img
                    src={currentLogo}
                    alt={article.source}
                    className="h-full w-full object-contain p-2"
                    title={article.source}
                    loading="eager"
                    crossOrigin="anonymous"
                    onError={() => {
                      if (hasMoreLogos) {
                        handleLogoError(index);
                      } else {
                        console.log(`No more logo sources for ${article.source}`);
                      }
                    }}
                    onLoad={() => {
                      console.log(`Logo loaded for ${article.source} from source ${currentLogoIndex}`);
                    }}
                  />
                ) : (
                  <div className="text-center px-2 py-3">
                    <div className="text-2xl mb-1">📰</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 line-clamp-2">{article.source || "News"}</div>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-base font-semibold text-slate-900 dark:text-white flex-1">{article.title}</div>
                </div>
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
                {article.related && article.related.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 text-xs">
                    {article.related.map((ticker) => (
                      <span key={ticker} className="rounded-full bg-blue-200/80 px-2.5 py-0.5 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
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
