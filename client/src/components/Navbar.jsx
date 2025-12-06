import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/" },
  { label: "Stocks", to: "/stocks" },
  { label: "Watchlist", to: "/watchlist" },
  { label: "Portfolio", to: "/portfolio" },
  { label: "Sectors", to: "/sectors" },
  { label: "News", to: "/news" },
  { label: "Settings", to: "/settings" }
];

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `text-sm font-medium px-3 py-2 rounded-md transition ${
          isActive ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar({ onSearch }) {
  const nav = useNavigate();
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
    <header className="bg-white shadow sticky top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleNavigateHome}
            className="text-left"
            aria-label="StockDash home"
          >
            <div className="text-xl font-bold tracking-tight">📈 StockDash</div>
            <div className="hidden text-xs text-gray-500 sm:block">Real-time market intelligence</div>
          </button>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {showSearch && (
            <input
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search symbol or company"
              className="hidden w-64 rounded-md border px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none md:block"
            />
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm md:hidden"
            aria-label="Toggle navigation"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {(menuOpen || showSearch) && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          {showSearch && (
            <div className="px-4 py-3">
              <input
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search symbol or company"
                className="w-full rounded-md border px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
          {menuOpen && (
            <nav className="flex flex-col gap-1 px-2 pb-3">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} onClick={handleNavItemClick} />
              ))}
            </nav>
          )}
        </div>
      )}
    </header>
  );
}
