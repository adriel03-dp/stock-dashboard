export default function Heatmap({ sectors = [] }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {sectors.map((s) => (
        <div
          key={s.name}
          className="p-3 rounded-lg text-white"
          style={{ background: s.change >= 0 ? "#16a34a" : "#dc2626" }}
        >
          <div className="font-semibold">{s.name}</div>
          <div className="text-xs">{s.change.toFixed(2)}%</div>
        </div>
      ))}
    </div>
  );
}
