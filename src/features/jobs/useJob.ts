import { useState, useEffect, useCallback, useRef } from 'react';
import type { JobWithSteps, JobDTO } from '../../shared/jobs/types';
import { getJob, listJobs, ListJobsFilter, ListJobsResponse } from './api';
import { ApiError } from '../../services/api/client';

export interface UseJobResult {
  data: JobWithSteps | null;
  error: ApiError | Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export interface UseJobsResult {
  data: ListJobsResponse | null;
  error: ApiError | Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and poll a single job by ID.
 * Polls getJob every 2s backing off to 10s.
 * Stops polling when job reaches a terminal state (completed, failed, cancelled).
 * Refetches on window focus.
 */
export function useJob(jobId: string | undefined): UseJobResult {
  const [data, setData] = useState<JobWithSteps | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const delayRef = useRef<number>(2000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchJob = useCallback(
    async (showLoading = false) => {
      if (!jobId) {
        setLoading(false);
        setData(null);
        setError(null);
        return;
      }
      if (showLoading) {
        setLoading(true);
      }
      try {
        const res = await getJob(jobId);
        if (mountedRef.current) {
          setData(res);
          setError(null);
        }
      } catch (err: unknown) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load job details'));
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [jobId]
  );

  const refetch = useCallback(async () => {
    delayRef.current = 2000;
    await fetchJob(false);
  }, [fetchJob]);

  // Initial fetch and reset on jobId change
  useEffect(() => {
    mountedRef.current = true;
    delayRef.current = 2000;
    fetchJob(true);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [jobId, fetchJob]);

  // Polling logic with backoff
  useEffect(() => {
    if (!jobId || !data) return;

    const isTerminal =
      data.state === 'completed' ||
      data.state === 'failed' ||
      data.state === 'cancelled';

    if (isTerminal) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const scheduleNextPoll = () => {
      timerRef.current = setTimeout(async () => {
        if (!mountedRef.current) return;
        await fetchJob(false);
        // Backoff: 2s -> 3s -> 4.5s -> 6.75s -> 10s (capped at 10s)
        delayRef.current = Math.min(10000, Math.round(delayRef.current * 1.5));
      }, delayRef.current);
    };

    scheduleNextPoll();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [jobId, data, fetchJob]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch]);

  return { data, error, loading, refetch };
}

/**
 * Hook to fetch a list of jobs with optional filters.
 * Refetches on window focus.
 */
export function useJobs(filter?: ListJobsFilter): UseJobsResult {
  const [data, setData] = useState<ListJobsResponse | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const filterKey = JSON.stringify(filter || {});

  const fetchJobs = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const parsedFilter: ListJobsFilter = JSON.parse(filterKey);
        const res = await listJobs(parsedFilter);
        setData(res);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error('Failed to load jobs'));
      } finally {
        setLoading(false);
      }
    },
    [filterKey]
  );

  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  useEffect(() => {
    const handleFocus = () => {
      fetchJobs(false);
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchJobs]);

  const refetch = useCallback(() => fetchJobs(false), [fetchJobs]);

  return { data, error, loading, refetch };
}
