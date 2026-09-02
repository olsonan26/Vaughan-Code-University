import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-md text-slate-900 animate-slideInRight ${
              toast.type === 'xp'
                ? 'bg-white/95 border-amber-200 shadow-amber-500/10'
                : toast.type === 'success'
                ? 'bg-white/95 border-emerald-200 shadow-emerald-500/10'
                : toast.type === 'warning'
                ? 'bg-white/95 border-amber-200 shadow-amber-500/10'
                : 'bg-white/95 border-indigo-200 shadow-indigo-500/10'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'xp' && <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-600" />}
            </div>

            <div className="flex-1 text-xs">
              <h5 className="font-bold text-slate-900 leading-snug">{toast.title}</h5>
              <p className="text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
