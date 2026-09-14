"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((title: string, message?: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-white shadow-lg transition-all animate-in slide-in-from-bottom-2 ${
                t.type === "success"
                  ? "border-emerald-200"
                  : t.type === "error"
                  ? "border-rose-200"
                  : t.type === "warning"
                  ? "border-amber-200"
                  : "border-purple-200"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {t.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {t.type === "error" && <AlertCircle className="h-4 w-4 text-rose-600" />}
                {t.type === "warning" && <AlertCircle className="h-4 w-4 text-amber-600" />}
                {t.type === "info" && <Info className="h-4 w-4 text-[#6D28D9]" />}
              </div>

              <div className="flex-1">
                <h4 className="text-xs font-semibold text-[#111111]">{t.title}</h4>
                {t.message && <p className="mt-0.5 text-[11px] text-[#666666]">{t.message}</p>}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: (title: string, message?: string) => {
        console.log(`[Toast]: ${title} - ${message}`);
      },
    };
  }
  return context;
}
