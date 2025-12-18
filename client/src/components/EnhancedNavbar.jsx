import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Menu, X, ChevronDown, Settings, LogOut, Home, TrendingUp, Briefcase, Newspaper, Layers, Eye, User } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { label: "Dashboard", to: "/", icon: Home },
  { label: "Stocks", to: "/stocks", icon: TrendingUp },
  { label: "Watchlist", to: "/watchlist", icon: Eye },
  { label: "Portfolio", to: "/portfolio", icon: Briefcase },
  { label: "Sectors", to: "/sectors", icon: Layers },
  { label: "News", to: "/news", icon: Newspaper }
];

const dropdownItems = [
  { label: "Settings", to: "/settings", icon: Settings },
];

function NavItem({ to, label, icon: Icon, onClick, isDropdown = false, isActive = false }) {
  return (
    <NavLink to={to} onClick={onClick} className="relative inline-flex w-full">
      {({ isActive: routeIsActive }) => {
        const active = isDropdown ? isActive : routeIsActive;
        return (
          <motion.div
            className={`flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              active
                ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </motion.div>
        );
      }}
    </NavLink>
  );
}

function DropdownMenu({ isOpen, onClose }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  return (
    <div ref={dropdownRef} className="relative">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            {dropdownItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 last:border-b-0"
                onClick={onClose}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EnhancedNavbar({ onSearch }) {
  const nav = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNavigateHome = () => {
    setMobileMenuOpen(false);
    nav("/");
  };

  const handleNavItemClick = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    nav("/login");
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (typeof onSearch === "function") {
      onSearch(value);
    }
  };

  const showSearch = typeof onSearch === "function";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-transparent backdrop-blur dark:border-slate-700/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo and Brand */}
        <motion.button
          type="button"
          onClick={handleNavigateHome}
          className="flex items-center gap-3 text-left transition-opacity hover:opacity-90"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 p-2 shadow-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">StockDash</div>
            <div className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">Market Intelligence</div>
          </div>
        </motion.button>

        {/* Desktop Navigation */}
        <LayoutGroup>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className="relative inline-flex">
                {({ isActive }) => (
                  <motion.div
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                    whileHover={{ y: -2 }}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </motion.div>
                )}
              </NavLink>
            ))}
          </nav>
        </LayoutGroup>

        {/* Search Bar (Desktop) */}
        {showSearch && (
          <motion.div
            className="hidden w-64 md:block"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search stocks, symbols..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 pr-10 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
              />
              <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </motion.div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <motion.button
            type="button"
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Toggle theme"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </motion.button>

          {/* User Menu (Dropdown) */}
          {user && (
            <div className="relative hidden md:block">
              <motion.button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <User className="h-4 w-4" />
                <span className="truncate max-w-[100px]">{user.username}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </motion.button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Logged in as</p>
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{user.email}</p>
                    </div>

                    <NavLink
                      to="/settings"
                      className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </NavLink>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Dropdown Menu */}
          <div className="relative hidden md:block">
            <motion.button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              More
              <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </motion.button>
            <DropdownMenu isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} />
          </div>

          {/* Mobile Menu Toggle */}
          <motion.button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-2 text-slate-600 lg:hidden dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 lg:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {/* Mobile Search */}
              {showSearch && (
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search stocks..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}

              {/* Mobile Nav Items */}
              {navItems.map((item) => (
                <NavItem
                  key={item.to}
                  {...item}
                  onClick={handleNavItemClick}
                />
              ))}

              {/* Mobile Dropdown Items */}
              <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                {dropdownItems.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    onClick={handleNavItemClick}
                  />
                ))}
                
                {/* Mobile Logout Button */}
                {user && (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
