import React from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
}) => {
  return (
    <div className="mb-6 space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="hover:text-indigo-600 transition-colors font-medium text-slate-600"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-1 max-w-3xl">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
