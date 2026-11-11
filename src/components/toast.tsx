import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, Trash2, X } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export type ToastType = "success" | "error" | "info" | "warning" | "delete";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export type ToastFn = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastContext);

// Disparador global para llamadas fuera de componentes React
let globalToastFn: ToastFn | null = null;
export function showToast(message: string, type: ToastType = "success") {
  if (globalToastFn) {
    globalToastFn(message, type);
  }
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
  delete: Trash2,
};

const BADGE_STYLES: Record<ToastType, string> = {
  success: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  error: "bg-rose-500/15 border-rose-500/35 text-rose-400",
  delete: "bg-rose-500/15 border-rose-500/35 text-rose-400",
  info: "bg-gold/15 border-gold/30 text-gold-soft",
  warning: "bg-amber-500/15 border-amber-500/35 text-amber-400",
};

const BORDER_ACCENT: Record<ToastType, string> = {
  success: "border-emerald-500/30",
  error: "border-rose-500/35",
  delete: "border-rose-500/35",
  info: "border-gold/30",
  warning: "border-amber-500/35",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, type: ToastType = "success") => {
    triggerHaptic(type === "error" || type === "delete" ? "medium" : "light");
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  globalToastFn = push;
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <aside
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 sm:top-5 z-[200] flex flex-col items-center gap-2.5 px-3 sm:px-4"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          const badgeStyle = BADGE_STYLES[toast.type] || BADGE_STYLES.info;
          const borderAccent = BORDER_ACCENT[toast.type] || BORDER_ACCENT.info;

          return (
            <div
              key={toast.id}
              role="status"
              className={`toast-enter pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border ${borderAccent} bg-[#0e1218]/95 px-3.5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${badgeStyle}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-[13px] font-medium text-stone-100 leading-snug break-words">
                    {toast.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                aria-label="Cerrar notificación"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}
