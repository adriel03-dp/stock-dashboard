import React from "react";

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1
});

function formatPercent(value) {
  if (value == null) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numberFormatter.format(numeric);
}

export default function SectorsGrid({ sectors = [], selected, onSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sectors.map((sector) => {
        const isSelected = selected === sector.name;
        const changePositive = Number(sector.changePercent) >= 0;
        return (
          <button
            key={sector.name}
            type="button"
            onClick={() => onSelect?.(sector.name)}
            className={`rounded border p-4 text-left transition shadow-sm hover:shadow-md focus:outline-none ${
              isSelected ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Sector</div>
                <div className="text-lg font-semibold text-gray-900">{sector.name}</div>
              </div>
              <div className={`text-sm font-semibold ${changePositive ? "text-emerald-600" : "text-rose-600"}`}>
                {formatPercent(sector.changePercent)}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Market Cap</div>
                <div className="font-medium text-gray-800">{formatNumber(sector.totalMarketCap)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Volume</div>
                <div className="font-medium text-gray-800">{formatNumber(sector.totalVolume)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Advancers</div>
                <div className="font-medium text-emerald-600">{sector.advancers}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Decliners</div>
                <div className="font-medium text-rose-600">{sector.decliners}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-500">Tap to view top movers</div>
          </button>
        );
      })}
    </div>
  );
}
