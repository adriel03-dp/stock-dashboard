import React, { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import NewsList from "../components/NewsList";
import { ErrorMessage } from "../components/SkeletonLoaders";
import { useFinnhubNews } from "../hooks/useFinnhubNews";

const CATEGORY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Markets", value: "markets" },
  { label: "Economy", value: "economy" },
  { label: "Technology", value: "technology" },
  { label: "Energy", value: "energy" },
  { label: "Crypto", value: "crypto" }
];

export default function NewsPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [symbols, setSymbols] = useState("");
  const [displayItems, setDisplayItems] = useState([]);
  const [newArticleNotification, setNewArticleNotification] = useState(null);

  // Finnhub real-time stream hook (ONLY SOURCE)
  const {
    articles: finnhubArticles,
    isConnected: finnhubConnected,
    error: finnhubError
  } = useFinnhubNews(true, (newArticles) => {
    if (newArticles.length > 0) {
      // Show notification for new articles
      setNewArticleNotification(newArticles.length);
      setTimeout(() => setNewArticleNotification(null), 3000);
    }
  });

  // Determine which articles to display
  useEffect(() => {
    console.log("📊 [NewsPage] Articles state updated:", {
      finnhubArticleCount: finnhubArticles.length,
      category,
      search,
      symbols,
      connected: finnhubConnected
    });
    
    let itemsToDisplay = finnhubArticles;

    // Apply filters
    if (category && category !== "all") {
      itemsToDisplay = itemsToDisplay.filter(item => item.category === category);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      itemsToDisplay = itemsToDisplay.filter(item =>
        item.title.toLowerCase().includes(lowerSearch) ||
        (item.description && item.description.toLowerCase().includes(lowerSearch))
      );
    }

    if (symbols) {
      const symbolSet = new Set(symbols.split(",").map(s => s.toUpperCase().trim()).filter(s => s));
      if (symbolSet.size > 0) {
        itemsToDisplay = itemsToDisplay.filter(item =>
          item.related && item.related.some(ticker => symbolSet.has(ticker.toUpperCase())) ||
          item.tickers && item.tickers.some(ticker => symbolSet.has(ticker.toUpperCase()))
        );
      }
    }

    // Sort by date
    itemsToDisplay = [...itemsToDisplay].sort((a, b) => {
      const dateA = new Date(a.publishedAt || 0);
      const dateB = new Date(b.publishedAt || 0);
      return dateB - dateA;
    });

    setDisplayItems(itemsToDisplay.slice(0, 50));
  }, [finnhubArticles, category, search, symbols]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 bg-fixed">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,197,94,0.15),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_85%_100%,rgba(168,85,247,0.12),transparent_45%)]" />
      <main className="relative z-0 mx-auto w-full max-w-7xl">
        <PageHeader
          title="Market News"
          description="Live Finnhub Real-time Headlines 🔴 LIVE"
          icon={Newspaper}
          breadcrumb={<Breadcrumb />}
        />
        <div className="px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4">
            {/* Finnhub status */}
            <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  🔴 Finnhub Live
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <span className={`inline-block h-2 w-2 rounded-full ${finnhubConnected ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
                  <span className={finnhubConnected ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                    {finnhubConnected ? "Connected" : "Connecting..."}
                  </span>
                </div>
              </div>

              {newArticleNotification && (
                <div className="animate-pulse rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  ✨ {newArticleNotification} new article{newArticleNotification > 1 ? "s" : ""} arrived!
                </div>
              )}
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  className={`rounded-full px-3 py-1 font-medium transition ${
                    category === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 shadow-sm hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Search and filter inputs */}
            <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex-1">
                <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400" htmlFor="news-search">
                  Keyword
                </label>
                <input
                  id="news-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. inflation, earnings"
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400" htmlFor="news-symbols">
                  Symbols
                </label>
                <input
                  id="news-symbols"
                  value={symbols}
                  onChange={(e) => setSymbols(e.target.value.toUpperCase())}
                  placeholder="AAPL, NVDA"
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Content display */}
            {!finnhubError && (
              <>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {displayItems.length} article{displayItems.length !== 1 ? "s" : ""} from Finnhub
                </div>
                <NewsList items={displayItems} />
              </>
            )}
            {finnhubError && <ErrorMessage message={finnhubError} />}
          </div>
        </div>
      </main>
    </div>
  );
}
