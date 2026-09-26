import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  FileText,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge } from './Badge';

export type AuthorityLevel = 1 | 2 | 3 | 4 | 5;

export interface AuthorityBadgeProps {
  level: AuthorityLevel;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const AuthorityBadge: React.FC<AuthorityBadgeProps> = ({
  level,
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const getAuthorityConfig = (lvl: AuthorityLevel) => {
    switch (lvl) {
      case 5:
        return {
          label: 'Canonical',
          variant: 'purple' as const,
          icon: <ShieldCheck className="w-3 h-3" />,
        };
      case 4:
        return {
          label: 'Approved Curriculum',
          variant: 'emerald' as const,
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      case 3:
        return {
          label: 'Trusted Research',
          variant: 'sky' as const,
          icon: <BookOpen className="w-3 h-3" />,
        };
      case 2:
        return {
          label: 'Working Notes',
          variant: 'amber' as const,
          icon: <FileText className="w-3 h-3" />,
        };
      case 1:
      default:
        return {
          label: 'External/Unverified',
          variant: 'slate' as const,
          icon: <HelpCircle className="w-3 h-3" />,
        };
    }
  };

  const config = getAuthorityConfig(level);

  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={config.icon}
      className={className}
      title={`Authority Level ${level}: ${config.label}`}
    >
      {showLabel ? config.label : `L${level}`}
    </Badge>
  );
};

export interface SourceChipProps {
  title: string;
  page?: number | string;
  authority?: AuthorityLevel;
  onView?: () => void;
  className?: string;
}

export const SourceChip: React.FC<SourceChipProps> = ({
  title,
  page,
  authority,
  onView,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-300 transition-all ${className}`}
    >
      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />

      <span className="truncate max-w-[200px]" title={title}>
        {title}
      </span>

      {page !== undefined && page !== null && (
        <span className="text-slate-500 font-mono text-[11px] shrink-0 bg-slate-200/60 px-1.5 py-0.5 rounded">
          p. {page}
        </span>
      )}

      {authority !== undefined && (
        <AuthorityBadge level={authority} size="sm" showLabel={false} />
      )}

      {onView && (
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
          aria-label={`View source ${title}`}
        >
          <span>VIEW</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
