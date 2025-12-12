import React from "react";
import { motion } from "framer-motion";

const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"]
  }
};

export function SkeletonCard({ count = 1, className = "" }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={`rounded-lg border border-slate-200 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:border-slate-700 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 ${className}`}
          variants={shimmer}
          animate="animate"
          transition={{ duration: 2, repeat: Infinity }}
          style={{ backgroundSize: "200% 100%" }}
        />
      ))}
    </>
  );
}

export function SkeletonText({ lines = 1, className = "" }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className={`h-4 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 ${
            i === lines - 1 ? "w-2/3" : "w-full"
          } ${className}`}
          variants={shimmer}
          animate="animate"
          transition={{ duration: 2, repeat: Infinity }}
          style={{ backgroundSize: "200% 100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <motion.div
              key={`${rowIndex}-${colIndex}`}
              className="h-10 flex-1 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700"
              variants={shimmer}
              animate="animate"
              transition={{ duration: 2, repeat: Infinity }}
              style={{ backgroundSize: "200% 100%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4, cols = 2 }) {
  return (
    <div className={`grid gap-4 grid-cols-1 md:grid-cols-${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="h-48 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700"
          variants={shimmer}
          animate="animate"
          transition={{ duration: 2, repeat: Infinity }}
          style={{ backgroundSize: "200% 100%" }}
        />
      ))}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <motion.div
        className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-blue-500 dark:border-slate-700 dark:border-t-blue-400"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export function LoadingMessage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
      <LoadingSpinner />
      <p className="mt-4 text-slate-600 dark:text-slate-400">Loading data...</p>
    </div>
  );
}

export function ErrorMessage({ message = "Failed to load data" }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-900 dark:bg-red-900/20">
      <p className="text-red-600 dark:text-red-400">{message}</p>
    </div>
  );
}

export function EmptyState({ title = "No data", message = "There's nothing to show here" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="text-lg font-medium text-slate-900 dark:text-white">{title}</p>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
