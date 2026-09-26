import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'ghost' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const base = 'rounded-2xl transition-all duration-150 overflow-hidden';
    const variantStyles = {
      default: 'bg-white border border-slate-200/80 shadow-xs hover:border-slate-300',
      flat: 'bg-slate-50 border border-slate-200',
      ghost: 'bg-transparent border border-slate-200/60',
      interactive:
        'bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 cursor-pointer active:scale-[0.995]',
    };

    return (
      <div
        ref={ref}
        className={`${base} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  description,
  actions,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}
      {...props}
    >
      <div className="space-y-0.5">
        {title && (
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
