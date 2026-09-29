import React from 'react';
import { useAuth } from './AuthProvider';

/** Always visible when no backend is configured, so demo data is never mistaken for real accounts. */
export const DemoModeBanner: React.FC = () => {
  const { isDemoMode } = useAuth();
  if (!isDemoMode) return null;
  return (
    <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-[11px] font-semibold text-center px-4 py-1.5">
      Demo mode: no backend configured. Sign-in and data are stored locally in this browser only.
    </div>
  );
};
