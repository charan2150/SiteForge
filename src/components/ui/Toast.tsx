"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { ToastMessage } from "@/types";

function ToastItem({ toast }: { toast: ToastMessage }) {
  const removeToast = useAppStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const colors = {
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    error: "border-red-500/40 bg-red-500/10 text-red-300",
    info: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  };

  const icons = {
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
    info: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  };

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 rounded-xl border backdrop-blur-xl shadow-xl animate-slide-in ${colors[toast.type]}`}
    >
      {icons[toast.type]}
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-96">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
