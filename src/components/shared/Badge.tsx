import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'slate' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'sky' | 'purple';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'slate',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center font-medium rounded-md tracking-tight select-none border';

  const variantStyles = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    sky: 'bg-sky-50 text-sky-700 border-sky-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1 font-semibold uppercase tracking-wider',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 font-medium',
  };

  return (
    <span
      className={`${base} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
