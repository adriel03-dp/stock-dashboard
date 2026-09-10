import React from "react";
import { Eye } from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import Watchlist from "../components/Watchlist";

export default function WatchlistPage() {
  return (
    <div className="page-content">
      <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Watchlist"
        description="Track stocks and assets you want to monitor"
        icon={Eye}
        breadcrumb={<Breadcrumb />}
      />
      <div className="px-4 py-8 sm:px-6">
        <Watchlist />
      </div>
      </div>
    </div>
  );
}
