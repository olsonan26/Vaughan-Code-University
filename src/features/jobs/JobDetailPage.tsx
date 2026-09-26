import React from 'react';
import { useParams } from 'react-router';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingState } from '../../components/shared/LoadingState';
import { useJob } from './useJob';
import { JobPipeline, formatJobType } from './JobPipeline';
import { ApiError } from '../../services/api/client';

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

export const JobDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, error, loading, refetch } = useJob(jobId);

  const isNotConnected = isNotConnectedError(error);

  const title = job ? formatJobType(job.type) : 'Generation Job';
  const breadcrumbs = [
    { label: 'Generation Jobs', to: '/instructor/jobs' },
    { label: job ? formatJobType(job.type) : jobId || 'Job Details' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs}
        description={job ? `Job ID: ${job.id}` : undefined}
      />

      {loading && !job && <LoadingState label="Loading job details..." />}

      {!loading && error && !job && (
        <ErrorState
          title={
            isNotConnected
              ? 'The Studio backend is not connected yet'
              : 'Failed to load job details'
          }
          whatFailed={
            isNotConnected
              ? 'Unable to reach the background job processing service.'
              : error.message || 'An error occurred while loading job details.'
          }
          whatIsSafe="Your local edits and studio configurations remain safe."
          onRetry={refetch}
        />
      )}

      {!loading && !error && !job && (
        <EmptyState
          title="Job not found"
          description="The requested generation job could not be found."
        />
      )}

      {job && <JobPipeline job={job} onRefresh={refetch} />}
    </div>
  );
};

export default JobDetailPage;
