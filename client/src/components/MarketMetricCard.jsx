export default function MarketMetricCard({ title, value, change }) {
  const positive = Number(change) >= 0;
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="flex items-baseline gap-3">
        <div className="text-2xl font-semibold">{value}</div>
        <div className={positive ? "text-green-500" : "text-red-500"}>
          {positive ? "+" : ""}
          {change}%
        </div>
      </div>
      <div className="h-12 mt-2 text-xs text-gray-400">sparkline</div>
    </div>
  );
}
