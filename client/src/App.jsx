import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import EnhancedNavbar from "./components/EnhancedNavbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ToastContainer from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Stocks from "./pages/Stocks";
import StockPage from "./pages/StockPage";
import WatchlistPage from "./pages/WatchlistPage";
import PortfolioPage from "./pages/PortfolioPage";
import SectorsPage from "./pages/SectorsPage";
import NewsPage from "./pages/NewsPage";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen w-full bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 overflow-x-hidden">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <Dashboard />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <Dashboard />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stocks"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <Stocks />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock/:symbol"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <StockPage />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/watchlist"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <WatchlistPage />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portfolio"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <PortfolioPage />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sectors"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <SectorsPage />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/news"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <NewsPage />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <>
                      <EnhancedNavbar />
                      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                        <SettingsPage />
                      </main>
                    </>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ToastContainer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
