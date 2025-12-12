import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGroup, motion } from "framer-motion";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Stocks", to: "/stocks" },
  { label: "Watchlist", to: "/watchlist" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Sectors", to: "/sectors" },
  { label: "News", to: "/news" },
  { label: "Settings", to: "/settings" }
];

const navMotion = {
  hover: { y: -2, transition: { type: "spring", stiffness: 260, damping: 18 } }
};

function NavItem({ to, label, onClick, showIndicator = true }) {
  return (
    <NavLink to={to} onClick={onClick} className="relative inline-flex">
      {({ isActive }) => (
        <motion.span
          className={`relative inline-flex items-center px-3 py-2 text-sm font-medium transition-colors ${
            isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
          }`}
          variants={navMotion}
          whileHover={showIndicator ? "hover" : undefined}
        >
          {label}
          {showIndicator && isActive && (
            <motion.span
              layoutId="nav-indicator"
              className="absolute inset-x-2 -bottom-1 h-1 rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-violet-500"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </motion.span>
      )}
    </NavLink>
  );
}

export default function Navbar({ onSearch }) {
  const nav = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigateHome = () => {
    setMenuOpen(false);
    nav("/");
  };

  const handleNavItemClick = () => {
    setMenuOpen(false);
  };

  const showSearch = typeof onSearch === "function";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNavigateHome}
            className="text-left"
            aria-label="StockDash home"
          >
            <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">📈 StockDash</div>
            <div className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">Real-time market intelligence</div>
          </button>
        </div>

        <LayoutGroup>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </LayoutGroup>

        <div className="flex items-center gap-3">
          {showSearch && (
            <input
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search symbol or company"
              className="hidden w-64 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 md:block"
            />
          )}

          <motion.button
            type="button"
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </motion.button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 md:hidden"
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {(menuOpen || showSearch) && (
        <div className="border-t border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800 md:hidden">
          {showSearch && (
            <div className="px-4 py-3">
              <input
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search symbol or company"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          )}
          {menuOpen && (
            <nav className="flex flex-col gap-1 px-2 pb-3">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} onClick={handleNavItemClick} showIndicator={false} />
              ))}
            </nav>
          )}
        </div>
      )}
    </header>
  );
}
