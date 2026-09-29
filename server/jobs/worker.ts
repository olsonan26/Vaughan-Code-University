import { getJobStore } from './queue.js';
import { getStepHandler } from './registry.js';
import type { JobStore } from './store.js';

export interface RunOnceOptions {
  workerId?: string;
  maxSteps?: number;
  timeBudgetMs?: number;
  store?: JobStore;
  gateway?: any;
  logger?: any;
}

export interface WorkerRunSummary {
  workerId: string;
  stepsClaimed: number;
  stepsCompleted: number;
  stepsFailed: number;
  totalDurationMs: number;
  details: Array<{ stepId: string; stepKey: string; status: 'completed' | 'failed' | 'cancelled'; durationMs: number; error?: string }>;
}

export function classifyError(
  error: unknown,
  attemptCount: number,
  maxAttempts: number
): { retryable: boolean; reason: string } {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || (error as any)?.status;

  if (
    errCode === 401 ||
    errCode === 403 ||
    errCode === 'unauthorized' ||
    errCode === 'forbidden' ||
    errMessage.toLowerCase().includes('not configured') ||
    errMessage.toLowerCase().includes('missing api key')
  ) {
    return { retryable: false, reason: `Configuration / Auth error: ${errMessage}` };
  }

  if (
    errCode === 429 ||
    (typeof errCode === 'number' && errCode >= 500) ||
    errMessage.toLowerCase().includes('timeout') ||
    errMessage.toLowerCase().includes('rate limit') ||
    errMessage.toLowerCase().includes('timed out') ||
    errMessage.toLowerCase().includes('econnreset') ||
    errMessage.toLowerCase().includes('fetch failed')
  ) {
    return { retryable: attemptCount < maxAttempts, reason: errMessage };
  }

  if (
    errMessage.toLowerCase().includes('validation') ||
    errMessage.toLowerCase().includes('invalid json') ||
    errMessage.toLowerCase().includes('zod')
  ) {
    return { retryable: attemptCount <= 1, reason: errMessage };
  }

  return { retryable: attemptCount < maxAttempts, reason: errMessage };
}

export function buildHumanErrorMessage(stepLabel: string, reason: string): string {
  if (reason.toLowerCase().includes('timed out') || reason.toLowerCase().includes('timeout')) {
    return `${stepLabel} generation failed after the request timed out. Completed steps are safe. Retry ${stepLabel}.`;
  }
  return `${stepLabel} generation failed: ${reason}. Completed steps are safe. Retry ${stepLabel}.`;
}

export async function runOnce(options: RunOnceOptions = {}): Promise<WorkerRunSummary> {
  const startTime = Date.now();
  const workerId = options.workerId || `worker-${crypto.randomUUID().slice(0, 8)}`;
  const maxSteps = options.maxSteps ?? 1;
  const timeBudgetMs = options.timeBudgetMs ?? 280000;
  const store = options.store || getJobStore();

  const summary: WorkerRunSummary = {
    workerId,
    stepsClaimed: 0,
    stepsCompleted: 0,
    stepsFailed: 0,
    totalDurationMs: 0,
    details: [],
  };

  for (let i = 0; i < maxSteps; i++) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= timeBudgetMs) {
      break;
    }

    const remainingBudget = timeBudgetMs - elapsed;
    const lockSeconds = Math.max(30, Math.min(300, Math.floor(remainingBudget / 1000)));

    const step = await store.claimNextStep(workerId, lockSeconds);
    if (!step) {
      break;
    }

    summary.stepsClaimed += 1;
    const stepStartTime = Date.now();

    const job = await store.getJob(step.jobId);
    if (!job || job.state === 'cancelled') {
      summary.details.push({
        stepId: step.id,
        stepKey: step.key,
        status: 'cancelled',
        durationMs: Date.now() - stepStartTime,
      });
      continue;
    }

    const handler = getStepHandler(job.type, step.key);
    if (!handler) {
      const errorMsg = `No handler registered for job type '${job.type}' and step key '${step.key}'`;
      const humanMsg = buildHumanErrorMessage(step.label, errorMsg);
      await store.failStep(step.id, humanMsg, { retryable: false });
      summary.stepsFailed += 1;
      summary.details.push({
        stepId: step.id,
        stepKey: step.key,
        status: 'failed',
        durationMs: Date.now() - stepStartTime,
        error: humanMsg,
      });
      continue;
    }

    try {
      const isCancelled = async () => {
        const j = await store.getJob(job.id);
        return !j || j.state === 'cancelled';
      };

      const reportProgress = async (partialPct: number) => {
        // progress reporting can be tracked or logged
      };

      const result = await handler({
        job,
        step,
        input: step.input || job.input || {},
        deps: {
          db: store,
          gateway: options.gateway,
          logger: options.logger,
        },
        reportProgress,
        isCancelled,
      });

      if (await isCancelled()) {
        summary.details.push({
          stepId: step.id,
          stepKey: step.key,
          status: 'cancelled',
          durationMs: Date.now() - stepStartTime,
        });
        continue;
      }

      await store.completeStep(step.id, result.output, result.meta);
      summary.stepsCompleted += 1;
      summary.details.push({
        stepId: step.id,
        stepKey: step.key,
        status: 'completed',
        durationMs: Date.now() - stepStartTime,
      });
    } catch (err: unknown) {
      const { retryable, reason } = classifyError(err, step.attemptCount, step.maxAttempts);
      const humanMsg = buildHumanErrorMessage(step.label, reason);
      await store.failStep(step.id, humanMsg, { retryable });

      summary.stepsFailed += 1;
      summary.details.push({
        stepId: step.id,
        stepKey: step.key,
        status: 'failed',
        durationMs: Date.now() - stepStartTime,
        error: humanMsg,
      });
    }
  }

  summary.totalDurationMs = Date.now() - startTime;
  return summary;
}
