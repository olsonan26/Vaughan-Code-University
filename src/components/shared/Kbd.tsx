import React from 'react';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export const Kbd: React.FC<KbdProps> = ({ children, className = '', ...props }) => {
  return (
    <kbd
      className={`inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-200/90 rounded shadow-2xs select-none ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
};
