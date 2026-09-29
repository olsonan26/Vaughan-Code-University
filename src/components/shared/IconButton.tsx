import React from 'react';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      'aria-label': ariaLabel,
      icon,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';

    const variantStyles = {
      primary:
        'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-xs border border-indigo-600/20',
      secondary:
        'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 active:bg-slate-100 shadow-2xs',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100/80 active:bg-slate-200/60',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs border border-rose-600/20',
    };

    const sizeStyles = {
      sm: 'w-7 h-7 text-xs',
      md: 'w-9 h-9 text-sm',
      lg: 'w-11 h-11 text-base',
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
