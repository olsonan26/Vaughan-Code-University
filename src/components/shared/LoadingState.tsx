import React from 'react';

export interface LoadingStateProps {
  label?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Loading...' }) => {
  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-200 rounded-md" />
          <div className="h-4 w-72 bg-slate-100 rounded-md" />
        </div>
        <div className="h-9 w-28 bg-slate-200 rounded-xl" />
      </div>

      <div className="text-xs font-semibold text-slate-400 flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <span>{label}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        <div className="h-28 bg-slate-100 rounded-xl p-4 space-y-3">
          <div className="h-4 w-3/4 bg-slate-200 rounded" />
          <div className="h-3 w-1/2 bg-slate-200 rounded" />
          <div className="h-3 w-full bg-slate-200 rounded" />
        </div>
        <div className="h-28 bg-slate-100 rounded-xl p-4 space-y-3">
          <div className="h-4 w-2/3 bg-slate-200 rounded" />
          <div className="h-3 w-1/3 bg-slate-200 rounded" />
          <div className="h-3 w-full bg-slate-200 rounded" />
        </div>
        <div className="h-28 bg-slate-100 rounded-xl p-4 space-y-3">
          <div className="h-4 w-4/5 bg-slate-200 rounded" />
          <div className="h-3 w-2/5 bg-slate-200 rounded" />
          <div className="h-3 w-full bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
