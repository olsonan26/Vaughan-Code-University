import { getServiceClient } from './deps.js';
import { SupabaseJobStore, type JobStore, type JobStoreListFilter } from './store.js';
import type { JobDTO, JobStepDTO, JobWithSteps, EnqueueJobParams, EnqueueStepInput } from '../../shared/jobs/types.js';

let defaultStore: JobStore | null = null;

export function setJobStore(store: JobStore | null) {
  defaultStore = store;
}

export function getJobStore(): JobStore {
  if (defaultStore) return defaultStore;
  return new SupabaseJobStore(getServiceClient());
}

export async function enqueueJob(params: EnqueueJobParams, store: JobStore = getJobStore()): Promise<JobWithSteps> {
  return store.enqueueJob(params);
}

export async function addSteps(
  jobId: string,
  steps: EnqueueStepInput[],
  store: JobStore = getJobStore()
): Promise<JobStepDTO[]> {
  return store.addSteps(jobId, steps);
}

export async function claimNextStep(
  workerId: string,
  lockSeconds?: number,
  store: JobStore = getJobStore()
): Promise<JobStepDTO | null> {
  return store.claimNextStep(workerId, lockSeconds);
}

export async function completeStep(
  stepId: string,
  output: Record<string, unknown>,
  meta?: { model?: string; usage?: { inputTokens?: number; outputTokens?: number }; estimatedCostUsd?: number },
  store: JobStore = getJobStore()
): Promise<JobStepDTO> {
  return store.completeStep(stepId, output, meta);
}

export async function failStep(
  stepId: string,
  error: string,
  opts?: { retryable?: boolean },
  store: JobStore = getJobStore()
): Promise<JobStepDTO> {
  return store.failStep(stepId, error, opts);
}

export async function recomputeJob(jobId: string, store: JobStore = getJobStore()): Promise<JobDTO> {
  return store.recomputeJob(jobId);
}

export async function cancelJob(jobId: string, store: JobStore = getJobStore()): Promise<JobDTO> {
  return store.cancelJob(jobId);
}

export async function pauseJob(jobId: string, store: JobStore = getJobStore()): Promise<JobDTO> {
  return store.pauseJob(jobId);
}

export async function resumeJob(jobId: string, store: JobStore = getJobStore()): Promise<JobDTO> {
  return store.resumeJob(jobId);
}

export async function retryJob(jobId: string, store: JobStore = getJobStore()): Promise<JobDTO> {
  return store.retryJob(jobId);
}

export async function retryStep(stepId: string, store: JobStore = getJobStore()): Promise<JobStepDTO> {
  return store.retryStep(stepId);
}

export async function getJob(jobId: string, store: JobStore = getJobStore()): Promise<JobDTO | null> {
  return store.getJob(jobId);
}

export async function getJobWithSteps(jobId: string, store: JobStore = getJobStore()): Promise<JobWithSteps | null> {
  return store.getJobWithSteps(jobId);
}

export async function listJobs(
  filter: JobStoreListFilter,
  store: JobStore = getJobStore()
): Promise<{ items: JobDTO[]; nextCursor: string | null }> {
  return store.listJobs(filter);
}

export async function getStep(stepId: string, store: JobStore = getJobStore()): Promise<JobStepDTO | null> {
  return store.getStep(stepId);
}
