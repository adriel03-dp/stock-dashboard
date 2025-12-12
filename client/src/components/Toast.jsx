import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, X, Info } from "lucide-react";

const toastStore = {
  listeners: [],
  toasts: [],

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  },

  notify(toasts) {
    this.listeners.forEach((callback) => callback(toasts));
  },

  add(message, type = "info", duration = 4000) {
    const id = Date.now();
    const toast = { id, message, type };
    this.toasts.push(toast);
    this.notify([...this.toasts]);

    if (duration > 0) {
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.notify([...this.toasts]);
      }, duration);
    }

    return id;
  },

  remove(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify([...this.toasts]);
  },

  success(message, duration = 4000) {
    return this.add(message, "success", duration);
  },

  error(message, duration = 6000) {
    return this.add(message, "error", duration);
  },

  warning(message, duration = 5000) {
    return this.add(message, "warning", duration);
  },

  info(message, duration = 4000) {
    return this.add(message, "info", duration);
  }
};

export const useToast = () => {
  return toastStore;
};

function SingleToast({ toast, onRemove }) {
  const icons = {
    success: <Check className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />
  };

  const colors = {
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: "text-emerald-600 dark:text-emerald-400",
      text: "text-emerald-900 dark:text-emerald-100"
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/30",
      border: "border-red-200 dark:border-red-800",
      icon: "text-red-600 dark:text-red-400",
      text: "text-red-900 dark:text-red-100"
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: "text-amber-600 dark:text-amber-400",
      text: "text-amber-900 dark:text-amber-100"
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      text: "text-blue-900 dark:text-blue-100"
    }
  };

  const style = colors[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`${style.bg} ${style.border} rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm`}
    >
      <div className="flex items-center gap-3">
        <div className={style.icon}>{icons[toast.type]}</div>
        <p className={`${style.text} flex-1 text-sm font-medium`}>{toast.message}</p>
        <button
          onClick={() => onRemove(toast.id)}
          className={`${style.icon} hover:opacity-70 transition`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return toastStore.subscribe(setToasts);
  }, []);

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
        {toasts.map((toast) => (
          <SingleToast
            key={toast.id}
            toast={toast}
            onRemove={(id) => toastStore.remove(id)}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}
