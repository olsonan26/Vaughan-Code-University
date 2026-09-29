import React from 'react';
import { AlertCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export interface IssueCardProps {
  severity: 'critical' | 'warning' | 'suggestion';
  title: React.ReactNode;
  children?: React.ReactNode;
  status?: 'open' | 'resolved' | 'ignored' | string;
  actions?: React.ReactNode;
  className?: string;
}

export const IssueCard: React.FC<IssueCardProps> = ({
  severity,
  title,
  children,
  status,
  actions,
  className = '',
}) => {
  const getSeverityStyles = (sev: 'critical' | 'warning' | 'suggestion') => {
    switch (sev) {
      case 'critical':
        return {
          container: 'bg-rose-50/40 border-rose-200/90 hover:border-rose-300',
          iconBg: 'bg-rose-100 text-rose-600',
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Critical Issue',
        };
      case 'warning':
        return {
          container: 'bg-amber-50/40 border-amber-200/90 hover:border-amber-300',
          iconBg: 'bg-amber-100 text-amber-600',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'Warning',
        };
      case 'suggestion':
      default:
        return {
          container: 'bg-indigo-50/30 border-indigo-200/90 hover:border-indigo-300',
          iconBg: 'bg-indigo-100 text-indigo-600',
          icon: <Lightbulb className="w-4 h-4" />,
          label: 'Suggestion',
        };
    }
  };

  const sevStyle = getSeverityStyles(severity);

  return (
    <div
      className={`rounded-2xl border p-4 shadow-2xs transition-all ${sevStyle.container} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`p-2 rounded-xl shrink-0 ${sevStyle.iconBg}`}>
            {sevStyle.icon}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                {title}
              </h4>
              {status && <StatusBadge type="finding_status" status={status} size="sm" />}
            </div>

            {children && (
              <div className="text-xs text-slate-600 leading-relaxed pt-0.5">
                {children}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-start pt-0.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
