'use client';

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

type ToastContextType = {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

type ToastListener = (toast: Omit<ToastItem, 'id'>) => void;
const listeners: Set<ToastListener> = new Set();

export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    listeners.forEach((listener) => listener({ type: 'success', message, title, duration }));
  },
  error: (message: string, title?: string, duration?: number) => {
    listeners.forEach((listener) => listener({ type: 'error', message, title, duration }));
  },
  warning: (message: string, title?: string, duration?: number) => {
    listeners.forEach((listener) => listener({ type: 'warning', message, title, duration }));
  },
  info: (message: string, title?: string, duration?: number) => {
    listeners.forEach((listener) => listener({ type: 'info', message, title, duration }));
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...t, id };
    setToasts((prev) => [...prev, newToast]);

    const dur = t.duration || (t.type === 'error' ? 5000 : 3500);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, dur);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => {
      listeners.delete(addToast);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      {/* Floating Toast Viewport */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-9999 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${
              t.type === 'success'
                ? 'bg-white/95 border-[#0F5132]/30 text-gray-900 ring-1 ring-[#0F5132]/10'
                : t.type === 'error'
                ? 'bg-white/95 border-red-500/30 text-gray-900 ring-1 ring-red-500/10'
                : t.type === 'warning'
                ? 'bg-white/95 border-amber-500/30 text-gray-900 ring-1 ring-amber-500/10'
                : 'bg-white/95 border-blue-500/30 text-gray-900 ring-1 ring-blue-500/10'
            }`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && (
                <div className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {t.type === 'error' && (
                <div className="p-1 rounded-full bg-red-100 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {t.type === 'warning' && (
                <div className="p-1 rounded-full bg-amber-100 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              {t.type === 'info' && (
                <div className="p-1 rounded-full bg-blue-100 text-blue-600">
                  <Info className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="flex-1 space-y-0.5 text-xs">
              {t.title && <p className="font-bold text-gray-900">{t.title}</p>}
              <p className="text-gray-700 leading-snug">{t.message}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-gray-400 hover:text-gray-600 p-0.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
