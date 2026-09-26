import { Hono, type Context } from 'hono';
import type { AppEnv } from '../context.js';
import { requireAuth, HttpError } from '../jobs/deps.js';
import {
  getJobWithSteps,
  getJob,
  getStep,
  listJobs,
  cancelJob,
  pauseJob,
  resumeJob,
  retryJob,
  retryStep,
  getJobStore,
} from '../jobs/queue.js';
import { runOnce } from '../jobs/worker.ts';
import { serverEnv } from '../env.js';
import type { JobState } from '../../shared/jobs/types.js';

export const jobsRoutes = new Hono<AppEnv>();

export function kickWorker(c: Context<AppEnv>) {
  const runner = () => runOnce({ workerId: 'kick-worker', maxSteps: 2, timeBudgetMs: 10000 });

  if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
    c.executionCtx.waitUntil(runner());
    return;
  }

  const appUrl = serverEnv.appUrl;
  if (appUrl) {
    const workerEndpoint = `${appUrl.replace(/\/$/, '')}/api/jobs/worker`;
    const secret = serverEnv.workerSecret || serverEnv.cronSecret;
    fetch(workerEndpoint, {
      method: 'POST',
      headers: {
        'x-worker-secret': secret,
        'Content-Type': 'application/json',
      },
    }).catch((err) => {
      console.error('kickWorker fire-and-forget fetch error:', err);
    });
  } else {
    runner().catch((err) => {
      console.error('kickWorker runner error:', err);
    });
  }
}

// GET / - List jobs
jobsRoutes.get('/', requireAuth(), async (c) => {
  const auth = c.get('auth');
  const stateQuery = c.req.query('state');
  const type = c.req.query('type');
  const courseId = c.req.query('courseId');
  const cursor = c.req.query('cursor');
  const limitStr = c.req.query('limit');

  const isAdmin = auth?.can?.('admin.jobs') || auth?.permissions?.has?.('admin.jobs' as any);

  let stateFilter: JobState | JobState[] | undefined;
  if (stateQuery) {
    stateFilter = stateQuery.includes(',') ? (stateQuery.split(',') as JobState[]) : (stateQuery as JobState);
  }

  const filter = {
    organizationId: auth?.organizationId,
    createdBy: isAdmin ? undefined : auth?.userId,
    state: stateFilter,
    type,
    courseId,
    cursor,
    limit: limitStr ? parseInt(limitStr, 10) : 50,
  };

  const result = await listJobs(filter);
  return c.json(result);
});

// GET /:id - Get job + steps (with queue pumping)
jobsRoutes.get('/:id', requireAuth(), async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');

  let jobWithSteps = await getJobWithSteps(id);
  if (!jobWithSteps) {
    throw new HttpError(404, 'not_found', 'Job not found');
  }

  const isAdmin = auth?.can?.('admin.jobs') || auth?.permissions?.has?.('admin.jobs' as any);
  const isCreator = auth?.userId === jobWithSteps.createdBy;
  const isOrgMember = auth?.organizationId === jobWithSteps.organizationId;

  if (!isCreator && !isAdmin && !isOrgMember) {
    throw new HttpError(403, 'forbidden', 'Access denied to this job');
  }

  // Queue Pump: if job has runnable steps and none currently running
  const isRunnableJobState =
    jobWithSteps.state === 'queued' || jobWithSteps.state === 'running' || jobWithSteps.state === 'retrying';

  if (isRunnableJobState) {
    const hasRunnableSteps = jobWithSteps.steps.some((s) => s.state === 'pending');
    const hasRunningSteps = jobWithSteps.steps.some((s) => s.state === 'running');

    if (hasRunnableSteps && !hasRunningSteps) {
      const runner = () => runOnce({ workerId: `poll-pump-${auth?.userId || 'anon'}`, maxSteps: 1, timeBudgetMs: 2500 });

      if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
        c.executionCtx.waitUntil(runner());
      } else {
        await runner();
        jobWithSteps = (await getJobWithSteps(id)) || jobWithSteps;
      }
    }
  }

  return c.json(jobWithSteps);
});

// POST /:id/cancel
jobsRoutes.post('/:id/cancel', requireAuth(), async (c) => {
  const id = c.req.param('id');
  const job = await getJob(id);
  if (!job) {
    throw new HttpError(404, 'not_found', 'Job not found');
  }

  const updatedJob = await cancelJob(id);
  return c.json(updatedJob);
});

// POST /:id/pause
jobsRoutes.post('/:id/pause', requireAuth(), async (c) => {
  const id = c.req.param('id');
  const job = await getJob(id);
  if (!job) {
    throw new HttpError(404, 'not_found', 'Job not found');
  }

  const updatedJob = await pauseJob(id);
  return c.json(updatedJob);
});

// POST /:id/resume
jobsRoutes.post('/:id/resume', requireAuth(), async (c) => {
  const id = c.req.param('id');
  const job = await getJob(id);
  if (!job) {
    throw new HttpError(404, 'not_found', 'Job not found');
  }

  const updatedJob = await resumeJob(id);
  kickWorker(c);
  return c.json(updatedJob);
});

// POST /:id/retry
jobsRoutes.post('/:id/retry', requireAuth(), async (c) => {
  const id = c.req.param('id');
  const job = await getJob(id);
  if (!job) {
    throw new HttpError(404, 'not_found', 'Job not found');
  }

  const updatedJob = await retryJob(id);
  kickWorker(c);
  return c.json(updatedJob);
});

// POST /steps/:stepId/retry
jobsRoutes.post('/steps/:stepId/retry', requireAuth(), async (c) => {
  const stepId = c.req.param('stepId');
  const step = await getStep(stepId);
  if (!step) {
    throw new HttpError(404, 'not_found', 'Job step not found');
  }

  const updatedStep = await retryStep(stepId);
  kickWorker(c);
  return c.json(updatedStep);
});

// POST /worker - Secret/cron worker trigger
jobsRoutes.post('/worker', async (c) => {
  const workerSecretHeader = c.req.header('x-worker-secret');
  const authHeader = c.req.header('authorization');

  const expectedWorkerSecret = serverEnv.workerSecret;
  const expectedCronSecret = serverEnv.cronSecret;

  const isWorkerSecretValid = expectedWorkerSecret && workerSecretHeader === expectedWorkerSecret;
  const isCronSecretValid = expectedCronSecret && authHeader === `Bearer ${expectedCronSecret}`;

  if (!isWorkerSecretValid && !isCronSecretValid) {
    throw new HttpError(401, 'unauthorized', 'Invalid worker secret or cron secret header');
  }

  const summary = await runOnce({
    workerId: 'worker-http-endpoint',
    maxSteps: 5,
    timeBudgetMs: 50000,
  });

  return c.json({ ok: true, summary });
});
