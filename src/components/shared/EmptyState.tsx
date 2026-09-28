import React from 'react';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  const renderIcon = () => {
    if (!icon) {
      return <FolderOpen className="w-8 h-8 text-slate-400" />;
    }
    // Already-rendered elements (e.g. <Icon />) pass through untouched.
    if (React.isValidElement(icon)) return icon;
    // Components: plain functions AND forwardRef/memo objects (lucide icons are
    // forwardRef objects, so a `typeof === 'function'` check alone is not enough).
    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && '$$typeof' in icon)
    ) {
      const IconComp = icon as React.ComponentType<{ className?: string }>;
      return <IconComp className="w-8 h-8 text-slate-400" />;
    }
    return icon as React.ReactNode;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 bg-white border border-slate-200 border-dashed rounded-2xl text-center shadow-2xs">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-500 border border-slate-200/60">
        {renderIcon()}
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 mb-5">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
