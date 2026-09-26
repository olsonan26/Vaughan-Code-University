import React from 'react';
import {
  CheckCircle2,
  Loader2,
  RotateCw,
  XCircle,
  Slash,
  Ban,
  Circle,
} from 'lucide-react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  label?: React.ReactNode;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  tone = 'indigo',
  size = 'md',
  showPercentage = false,
  className = '',
  ...props
}) => {
  const clampedValue = Math.min(100, Math.max(0, Math.round(value)));

  const toneStyles = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-600',
    sky: 'bg-sky-500',
    slate: 'bg-slate-600',
  };

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`space-y-1.5 ${className}`} {...props}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700">
          {label && <span className="truncate">{label}</span>}
          {showPercentage && <span className="text-slate-500 shrink-0 font-mono">{clampedValue}%</span>}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === 'string' ? label : undefined}
        className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizeStyles[size]}`}
      >
        <div
          className={`h-full transition-all duration-300 rounded-full ${toneStyles[tone]}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

export type ProgressStepState =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'retrying';

export interface ProgressStepItem {
  key: string;
  label: string;
  state: ProgressStepState;
  detail?: string;
}

export interface ProgressStepsProps {
  steps: ProgressStepItem[];
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps,
  layout = 'vertical',
  className = '',
}) => {
  const getStepIcon = (state: ProgressStepState) => {
    switch (state) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />;
      case 'retrying':
        return <RotateCw className="w-4 h-4 text-amber-600 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'skipped':
        return <Slash className="w-3.5 h-3.5 text-slate-400" />;
      case 'cancelled':
        return <Ban className="w-3.5 h-3.5 text-slate-400" />;
      case 'pending':
      default:
        return <Circle className="w-3.5 h-3.5 text-slate-300 fill-slate-100" />;
    }
  };

  const getStepBg = (state: ProgressStepState) => {
    switch (state) {
      case 'completed':
        return 'bg-emerald-50 border-emerald-200';
      case 'running':
        return 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20';
      case 'retrying':
        return 'bg-amber-50 border-amber-200';
      case 'failed':
        return 'bg-rose-50 border-rose-200';
      case 'skipped':
      case 'cancelled':
        return 'bg-slate-50 border-slate-200';
      case 'pending':
      default:
        return 'bg-white border-slate-200';
    }
  };

  if (layout === 'horizontal') {
    return (
      <div className={`flex items-start w-full overflow-x-auto py-2 ${className}`}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <div key={step.key} className="flex-1 flex items-center min-w-[120px]">
              <div className="flex flex-col items-center text-center space-y-1.5 flex-1 px-2">
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${getStepBg(
                    step.state
                  )}`}
                >
                  {getStepIcon(step.state)}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-800 leading-tight truncate">{step.label}</p>
                  {step.detail && <p className="text-[10px] text-slate-500 line-clamp-1">{step.detail}</p>}
                </div>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 w-full shrink-0 ${
                    step.state === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-3 relative ${className}`}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <div key={step.key} className="relative flex items-start gap-3">
            {!isLast && (
              <div
                className={`absolute left-4 top-8 -bottom-3 w-0.5 -ml-px ${
                  step.state === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
                }`}
              />
            )}
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 ${getStepBg(
                step.state
              )}`}
            >
              {getStepIcon(step.state)}
            </div>
            <div className="min-w-0 flex-1 pt-1 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900">{step.label}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  {step.state}
                </span>
              </div>
              {step.detail && <p className="text-xs text-slate-500 leading-relaxed">{step.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
