import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import EnhancedNavbar from './components/EnhancedNavbar';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/Toast';
import Dashboard from './pages/Dashboard';
import Stocks from './pages/Stocks';
import StockPage from './pages/StockPage';
import WatchlistPage from './pages/WatchlistPage';
import PortfolioPage from './pages/PortfolioPage';
import SectorsPage from './pages/SectorsPage';
import NewsPage from './pages/NewsPage';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

function WorkspaceLayout() {
  return <ProtectedRoute><EnhancedNavbar/><main className="app-main" id="main-content"><Outlet/></main></ProtectedRoute>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <div className="app-root">
                <Routes>
                  <Route path="/login" element={<Login/>}/>
                  <Route path="/register" element={<Register/>}/>
                  <Route element={<WorkspaceLayout/>}>
                    <Route path="/" element={<Dashboard/>}/>
                    <Route path="/dashboard" element={<Dashboard/>}/>
                    <Route path="/stocks" element={<Stocks/>}/>
                    <Route path="/stock/:symbol" element={<StockPage/>}/>
                    <Route path="/watchlist" element={<WatchlistPage/>}/>
                    <Route path="/portfolio" element={<PortfolioPage/>}/>
                    <Route path="/sectors" element={<SectorsPage/>}/>
                    <Route path="/news" element={<NewsPage/>}/>
                    <Route path="/settings" element={<SettingsPage/>}/>
                  </Route>
                  <Route path="*" element={<NotFound/>}/>
                </Routes>
                <ToastContainer/>
              </div>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}
