import React, { useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  MinusCircle,
  RotateCw,
  Clock,
  Coins,
  DollarSign,
  AlertTriangle,
  Play,
  Pause,
  Ban,
  RefreshCw,
} from 'lucide-react';
import type { JobWithSteps, JobStepDTO, JobStepState, JobState } from '../../shared/jobs/types';
import { ProgressBar } from '../../components/shared/ProgressBar';
import { Button } from '../../components/shared/Button';
import { JobStatusBadge } from './JobStatusBadge';
import { cancelJob, pauseJob, resumeJob, retryJob, retryStep } from './api';

export interface JobPipelineProps {
  job: JobWithSteps;
  onRefresh?: () => void | Promise<void>;
  className?: string;
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  'source.process': 'Process Knowledge Source',
  'course.blueprint': 'Build Course Blueprint',
  'course.generate': 'Generate Full Course',
  'lesson.generate': 'Generate Lesson',
  'lesson.section.regenerate': 'Regenerate Lesson Section',
  'assessments.generate': 'Generate Assessments',
  'flashcards.generate': 'Generate Flashcards',
  'worksheets.generate': 'Generate Worksheets',
  'visuals.identify': 'Identify Visual Needs',
  'visuals.prompt': 'Generate Visual Prompts',
  'audit.lesson': 'Audit Lesson Accuracy',
  'audit.course': 'Audit Course Consistency',
  'director.analyze': 'Course Director Analysis',
  'publish.course': 'Publish Course',
};

export function formatJobType(type: string): string {
  if (JOB_TYPE_LABELS[type]) {
    return JOB_TYPE_LABELS[type];
  }
  return type
    .replace(/\./g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStepIcon(state: JobStepState | 'retrying') {
  switch (state) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />;
    case 'retrying':
      return <RotateCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
    case 'skipped':
    case 'cancelled':
      return <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />;
    case 'pending':
    default:
      return <Circle className="w-4 h-4 text-slate-300 fill-slate-100 shrink-0" />;
  }
}

function formatElapsedTime(
  startedAt?: string | null,
  completedAt?: string | null,
  createdAt?: string | null
): string {
  const start = startedAt ? new Date(startedAt).getTime() : createdAt ? new Date(createdAt).getTime() : null;
  if (!start) return '0s';

  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const totalSec = Math.floor(diffMs / 1000);

  if (totalSec < 60) {
    return `${totalSec}s`;
  }
  const mins = Math.floor(totalSec / 60);
  const remSec = totalSec % 60;
  if (mins < 60) {
    return `${mins}m ${remSec}s`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

function getProgressBarTone(state: JobState): 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' {
  switch (state) {
    case 'completed':
      return 'emerald';
    case 'failed':
      return 'rose';
    case 'paused':
      return 'amber';
    case 'running':
    case 'retrying':
      return 'indigo';
    case 'queued':
    case 'cancelled':
    default:
      return 'slate';
  }
}

export const JobPipeline: React.FC<JobPipelineProps> = ({ job, onRefresh, className = '' }) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [retryingStepId, setRetryingStepId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = async (actionName: string, actionFn: () => Promise<unknown>) => {
    setActionLoading(actionName);
    setActionError(null);
    try {
      await actionFn();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${actionName} job`;
      setActionError(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryStep = async (stepId: string) => {
    setRetryingStepId(stepId);
    setActionError(null);
    try {
      await retryStep(stepId);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retry step';
      setActionError(msg);
    } finally {
      setRetryingStepId(null);
    }
  };

  const hasTokens = job.inputTokens != null || job.outputTokens != null;
  const totalTokens = (job.inputTokens || 0) + (job.outputTokens || 0);
  const hasCost = job.estimatedCostUsd != null;
  const elapsedTimeStr = formatElapsedTime(job.startedAt, job.completedAt || job.cancelledAt, job.createdAt);

  const canCancel = ['queued', 'running', 'paused', 'retrying'].includes(job.state);
  const canPause = ['running', 'queued', 'retrying'].includes(job.state);
  const canResume = job.state === 'paused';
  const canRetryJob = job.state === 'failed';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Action Failed</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                {formatJobType(job.type)}
              </h2>
              <JobStatusBadge status={job.state} />
            </div>
            {job.currentStage && (
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Stage: <span className="text-slate-700 font-semibold">{job.currentStage}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {canRetryJob && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                isLoading={actionLoading === 'retry'}
                onClick={() => handleAction('retry', () => retryJob(job.id))}
              >
                Retry job
              </Button>
            )}
            {canResume && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Play className="w-3.5 h-3.5" />}
                isLoading={actionLoading === 'resume'}
                onClick={() => handleAction('resume', () => resumeJob(job.id))}
              >
                Resume
              </Button>
            )}
            {canPause && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pause className="w-3.5 h-3.5" />}
                isLoading={actionLoading === 'pause'}
                onClick={() => handleAction('pause', () => pauseJob(job.id))}
              >
                Pause
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Ban className="w-3.5 h-3.5" />}
                isLoading={actionLoading === 'cancel'}
                onClick={() => handleAction('cancel', () => cancelJob(job.id))}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          value={job.progress}
          showPercentage
          tone={getProgressBarTone(job.state)}
          size="md"
        />

        {/* Metadata Footer */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Elapsed: <strong className="text-slate-700 font-mono">{elapsedTimeStr}</strong></span>
          </div>

          {hasTokens && (
            <div className="flex items-center gap-1.5 font-medium">
              <Coins className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Tokens: <strong className="text-slate-700 font-mono">{totalTokens.toLocaleString()}</strong>
                {job.inputTokens != null && job.outputTokens != null && (
                  <span className="text-slate-400 font-normal text-[11px] ml-1">
                    ({job.inputTokens.toLocaleString()} in / {job.outputTokens.toLocaleString()} out)
                  </span>
                )}
              </span>
            </div>
          )}

          {hasCost && (
            <div className="flex items-center gap-1.5 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold font-mono">
                ${job.estimatedCostUsd!.toFixed(4)} est.
              </span>
            </div>
          )}
        </div>

        {/* Job Level Error */}
        {job.error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium">
            <span className="font-bold">Error:</span> {job.error}
          </div>
        )}
      </div>

      {/* Real Steps List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          Pipeline Steps ({job.steps.length})
        </h3>

        {job.steps.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No steps defined for this job.</p>
        ) : (
          <div className="space-y-3 relative">
            {job.steps.map((step: JobStepDTO, index: number) => {
              const isLast = index === job.steps.length - 1;
              const isStepRetrying = retryingStepId === step.id;

              return (
                <div key={step.id || step.key} className="relative flex items-start gap-3.5">
                  {!isLast && (
                    <div
                      className={`absolute left-4 top-8 -bottom-3 w-0.5 -ml-px ${
                        step.state === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  <div className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center shrink-0 z-10 shadow-2xs">
                    {getStepIcon(isStepRetrying ? 'retrying' : step.state)}
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{step.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                          {step.key}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          {step.state}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-mono">
                          Attempts: {step.attemptCount} / {step.maxAttempts}
                        </span>
                        {step.state === 'failed' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<RotateCw className="w-3 h-3" />}
                            isLoading={isStepRetrying}
                            onClick={() => handleRetryStep(step.id)}
                            className="text-[11px] py-1 px-2 h-7"
                          >
                            Retry step
                          </Button>
                        )}
                      </div>
                    </div>

                    {step.error && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-mono mt-1.5 whitespace-pre-wrap">
                        {step.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPipeline;
