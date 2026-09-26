import React from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

export interface ErrorStateProps {
  title: string;
  whatFailed?: string;
  whatIsSafe?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  whatFailed,
  whatIsSafe,
  onRetry,
  retrying = false,
}) => {
  return (
    <div className="p-6 bg-amber-50/80 border border-amber-200 rounded-2xl shadow-2xs space-y-4">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <h3 className="text-base font-bold text-amber-950">{title}</h3>
          
          {whatFailed && (
            <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
              <span className="font-bold">What failed:</span> {whatFailed}
            </p>
          )}

          {whatIsSafe && (
            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-amber-200/60 text-xs text-emerald-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <span className="font-bold text-emerald-900">What remains safe:</span> {whatIsSafe}
              </span>
            </div>
          )}
        </div>
      </div>

      {onRetry && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Retrying...' : 'Retry Action'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
