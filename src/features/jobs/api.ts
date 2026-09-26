import { apiFetch } from '../../services/api/client';
import type { JobDTO, JobStepDTO, JobWithSteps, JobState } from '../../shared/jobs/types';

export interface ListJobsFilter {
  state?: JobState | JobState[] | string;
  type?: string;
  courseId?: string;
  cursor?: string;
  limit?: number;
}

export interface ListJobsResponse {
  items: JobDTO[];
  nextCursor: string | null;
}

/**
 * List jobs with optional filter parameters.
 */
export async function listJobs(filter?: ListJobsFilter): Promise<ListJobsResponse> {
  const params = new URLSearchParams();
  if (filter?.state) {
    const stateVal = Array.isArray(filter.state) ? filter.state.join(',') : filter.state;
    params.set('state', stateVal);
  }
  if (filter?.type) params.set('type', filter.type);
  if (filter?.courseId) params.set('courseId', filter.courseId);
  if (filter?.cursor) params.set('cursor', filter.cursor);
  if (filter?.limit) params.set('limit', String(filter.limit));

  const query = params.toString();
  const url = query ? `/api/jobs?${query}` : '/api/jobs';
  return apiFetch<ListJobsResponse>(url);
}

/**
 * Get job details including its steps.
 */
export async function getJob(id: string): Promise<JobWithSteps> {
  return apiFetch<JobWithSteps>(`/api/jobs/${id}`);
}

/**
 * Cancel a job.
 */
export async function cancelJob(id: string): Promise<JobDTO> {
  return apiFetch<JobDTO>(`/api/jobs/${id}/cancel`, { method: 'POST' });
}

/**
 * Pause a job.
 */
export async function pauseJob(id: string): Promise<JobDTO> {
  return apiFetch<JobDTO>(`/api/jobs/${id}/pause`, { method: 'POST' });
}

/**
 * Resume a paused job.
 */
export async function resumeJob(id: string): Promise<JobDTO> {
  return apiFetch<JobDTO>(`/api/jobs/${id}/resume`, { method: 'POST' });
}

/**
 * Retry a failed job.
 */
export async function retryJob(id: string): Promise<JobDTO> {
  return apiFetch<JobDTO>(`/api/jobs/${id}/retry`, { method: 'POST' });
}

/**
 * Retry a specific job step.
 */
export async function retryStep(stepId: string): Promise<JobStepDTO> {
  return apiFetch<JobStepDTO>(`/api/jobs/steps/${stepId}/retry`, { method: 'POST' });
}
