import React from "react";
import Navbar from "../components/Navbar";
import Watchlist from "../components/Watchlist";

export default function WatchlistPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Watchlist</h1>
        <Watchlist />
      </div>
    </div>
  );
}
