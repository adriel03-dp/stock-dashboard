import { motion } from "framer-motion";

const positivePalette = ["from-emerald-500", "via-emerald-400", "to-emerald-500/80"];
const negativePalette = ["from-rose-500", "via-rose-400", "to-rose-500/80"];

export default function Heatmap({ sectors = [] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {sectors.map((s) => {
        const positive = Number(s.change) >= 0;
        const [from, via, to] = positive ? positivePalette : negativePalette;

        return (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br ${from} ${via} ${to} p-4 text-white shadow-lg shadow-black/10 dark:shadow-black/40`}
          >
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
            <div className="relative space-y-1">
              <div className="text-sm uppercase tracking-wide text-white/75">Sector</div>
              <div className="text-lg font-semibold uppercase">{s.name}</div>
              <div className="text-sm font-medium text-white/90">
                {Number(s.change).toFixed(2)}%
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
