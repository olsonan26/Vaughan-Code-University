import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
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
      sm: 'text-xs px-2.5 py-1.5 gap-1.5 font-medium',
      md: 'text-sm px-3.5 py-2 gap-2 font-medium',
      lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
