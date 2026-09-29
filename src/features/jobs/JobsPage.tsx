import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingState } from '../../components/shared/LoadingState';
import { ProgressBar } from '../../components/shared/ProgressBar';
import { useJobs } from './useJob';
import { JobStatusBadge } from './JobStatusBadge';
import { formatJobType } from './JobPipeline';
import { ApiError } from '../../services/api/client';
import type { ListJobsFilter } from './api';
import type { JobState } from '../../../shared/jobs/types';

type FilterTab = 'all' | 'active' | 'failed' | 'completed';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'failed', label: 'Failed' },
  { id: 'completed', label: 'Completed' },
];

function isNotConnectedError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof ApiError) {
    return (
      err.status === 404 ||
      err.status === 503 ||
      err.code === 'network' ||
      err.code === 'not_configured'
    );
  }
  const e = err as { status?: number; code?: string };
  return (
    e.status === 404 ||
    e.status === 503 ||
    e.code === 'network' ||
    e.code === 'not_configured'
  );
}

function getToneForState(state: JobState | string): 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' {
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
    default:
      return 'slate';
  }
}

export const JobsPage: React.FC = () => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const filter = useMemo<ListJobsFilter | undefined>(() => {
    if (filterTab === 'active') {
      return { state: ['queued', 'running', 'paused', 'retrying'] };
    }
    if (filterTab === 'failed') {
      return { state: 'failed' };
    }
    if (filterTab === 'completed') {
      return { state: 'completed' };
    }
    return undefined;
  }, [filterTab]);

  const { data, error, loading, refetch } = useJobs(filter);

  const isNotConnected = isNotConnectedError(error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generation Jobs"
        description="Monitor and manage background AI generation jobs."
        actions={
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* State Filter Pills */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && !data && <LoadingState label="Loading generation jobs..." />}

      {/* Error state */}
      {error && !data && (
        <ErrorState
          title={
            isNotConnected
              ? 'The Studio backend is not connected yet'
              : 'Failed to load generation jobs'
          }
          whatFailed={
            isNotConnected
              ? 'Unable to reach the background job processing service.'
              : error.message || 'An error occurred while fetching generation jobs.'
          }
          whatIsSafe="Your local edits and studio configurations remain safe."
          onRetry={refetch}
        />
      )}

      {/* Empty state */}
      {!loading && !error && data && data.items.length === 0 && (
        <EmptyState
          title="No generation jobs yet."
          description={
            filterTab === 'all'
              ? 'When background AI tasks run, they will appear here.'
              : `No generation jobs currently match the "${filterTab}" state.`
          }
        />
      )}

      {/* Job list */}
      {data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((job) => (
            <Link
              key={job.id}
              to={`/instructor/jobs/${job.id}`}
              className="block p-4 sm:p-5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-2xs hover:shadow-xs transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {formatJobType(job.type)}
                    </h2>
                    <JobStatusBadge status={job.state} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {job.courseId ? `Course: ${job.courseId}` : 'No course'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 sm:text-right">
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(job.progress)}%</span>
                    </div>
                    <ProgressBar
                      value={job.progress}
                      size="sm"
                      tone={getToneForState(job.state)}
                    />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors hidden sm:block" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobsPage;
