import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";

const pathLabels = {
  "/": "Dashboard",
  "/stocks": "Stocks",
  "/stock": "Stock Details",
  "/watchlist": "Watchlist",
  "/portfolio": "Portfolio",
  "/sectors": "Sectors",
  "/news": "News",
  "/settings": "Settings"
};

function getBreadcrumbs(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = [{ label: "Home", path: "/" }];

  let currentPath = "";
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = pathLabels[currentPath] || pathLabels[`/${segments[0]}`] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    // For stock detail pages, add the symbol
    if (segment === "stock" && segments[segments.indexOf(segment) + 1]) {
      breadcrumbs.push({
        label: "Stocks",
        path: "/stocks"
      });
      breadcrumbs.push({
        label: segments[segments.indexOf(segment) + 1].toUpperCase(),
        path: currentPath + `/${segments[segments.indexOf(segment) + 1]}`
      });
    } else if (!breadcrumbs.some((b) => b.path === currentPath)) {
      breadcrumbs.push({
        label,
        path: currentPath
      });
    }
  });

  return breadcrumbs;
}

export default function Breadcrumb() {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <nav className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Go home"
        >
          <Home className="h-4 w-4" />
        </Link>

        {breadcrumbs.length > 1 && <ChevronRight className="h-3 w-3" />}

        {breadcrumbs.slice(1).map((crumb, index) => {
          const isLast = index === breadcrumbs.slice(1).length - 1;

          return (
            <motion.div
              key={crumb.path}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (index + 1) * 0.05 }}
              className="flex items-center gap-2"
            >
              {isLast ? (
                <span className="text-slate-900 dark:text-white font-semibold">
                  {crumb.label}
                </span>
              ) : (
                <>
                  <Link
                    to={crumb.path}
                    className="transition hover:text-slate-900 dark:hover:text-white"
                  >
                    {crumb.label}
                  </Link>
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </nav>
  );
}

