import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';

export interface SaveIndicatorProps {
  state: 'idle' | 'saving' | 'saved' | 'error';
  onRetry?: () => void;
  savedAt?: Date | string | null;
  className?: string;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  state,
  onRetry,
  savedAt,
  className = '',
}) => {
  const formatSavedAt = (time: Date | string): string => {
    try {
      const date = typeof time === 'string' ? new Date(time) : time;
      if (isNaN(date.getTime())) return String(time);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(time);
    }
  };

  if (state === 'saving') {
    return (
      <div
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg animate-pulse ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
        <span>Saving...</span>
      </div>
    );
  }

  if (state === 'saved') {
    return (
      <div
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Saved{savedAt ? ` at ${formatSavedAt(savedAt)}` : ''}</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        aria-live="assertive"
        className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/80 rounded-lg ${className}`}
      >
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Save failed</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 hover:text-rose-950 underline cursor-pointer ml-0.5"
          >
            <RotateCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // Idle state
  if (savedAt) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs text-slate-500 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Saved at {formatSavedAt(savedAt)}</span>
      </div>
    );
  }

  return null;
};
