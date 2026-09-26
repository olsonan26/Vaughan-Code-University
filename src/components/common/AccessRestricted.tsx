import React from 'react';
import { Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** Shown when a user opens a protected URL (e.g. /instructor) without the required role. */
export const AccessRestricted: React.FC<{ area: string }> = ({ area }) => {
  const { setActiveTab, currentUser, openAuthModal } = useApp();
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
        <Lock className="w-5 h-5 text-slate-500" />
      </div>
      <h1 className="text-lg font-bold text-slate-900">{area} is restricted</h1>
      <p className="mt-2 text-sm text-slate-500">
        This area is available to Vaughan Code University faculty only.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2">
        {!currentUser && (
          <button onClick={openAuthModal} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer">
            Sign in
          </button>
        )}
        <button onClick={() => setActiveTab('community')} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer">
          Back to campus
        </button>
      </div>
    </div>
  );
};
