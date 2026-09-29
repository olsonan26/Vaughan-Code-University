import type { SupabaseClient } from '@supabase/supabase-js';
import type { JobDTO, JobStepDTO, JobWithSteps, EnqueueJobParams, EnqueueStepInput, JobState, JobStepState } from '../../shared/jobs/types.js';

export interface JobStoreListFilter {
  organizationId?: string;
  createdBy?: string;
  state?: JobState | JobState[];
  type?: string;
  courseId?: string;
  limit?: number;
  cursor?: string;
}

export interface JobStore {
  enqueueJob(params: EnqueueJobParams): Promise<JobWithSteps>;
  addSteps(jobId: string, steps: EnqueueStepInput[]): Promise<JobStepDTO[]>;
  claimNextStep(workerId: string, lockSeconds?: number): Promise<JobStepDTO | null>;
  completeStep(
    stepId: string,
    output: Record<string, unknown>,
    meta?: { model?: string; usage?: { inputTokens?: number; outputTokens?: number }; estimatedCostUsd?: number }
  ): Promise<JobStepDTO>;
  failStep(stepId: string, error: string, opts?: { retryable?: boolean }): Promise<JobStepDTO>;
  recomputeJob(jobId: string): Promise<JobDTO>;
  cancelJob(jobId: string): Promise<JobDTO>;
  pauseJob(jobId: string): Promise<JobDTO>;
  resumeJob(jobId: string): Promise<JobDTO>;
  retryJob(jobId: string): Promise<JobDTO>;
  retryStep(stepId: string): Promise<JobStepDTO>;
  getJob(jobId: string): Promise<JobDTO | null>;
  getJobWithSteps(jobId: string): Promise<JobWithSteps | null>;
  getStep(stepId: string): Promise<JobStepDTO | null>;
  listJobs(filter: JobStoreListFilter): Promise<{ items: JobDTO[]; nextCursor: string | null }>;
}

/**
 * In-Memory JobStore implementation for Vitest unit tests and local mock runs.
 * Exactly mimics Supabase RPC and SQL table constraints.
 */
export class InMemoryJobStore implements JobStore {
  private jobs = new Map<string, JobDTO>();
  private steps = new Map<string, JobStepDTO>();

  async enqueueJob(params: EnqueueJobParams): Promise<JobWithSteps> {
    const now = new Date().toISOString();

    if (params.idempotencyKey) {
      for (const job of this.jobs.values()) {
        if (
          job.organizationId === params.organizationId &&
          job.idempotencyKey === params.idempotencyKey &&
          job.state !== 'failed' &&
          job.state !== 'cancelled'
        ) {
          const jobSteps = this.getJobSteps(job.id);
          return { ...job, steps: jobSteps };
        }
      }
    }

    const jobId = crypto.randomUUID();
    const initialStage = params.steps[0]?.label || '01 Validate Sources';

    const job: JobDTO = {
      id: jobId,
      organizationId: params.organizationId,
      createdBy: params.createdBy,
      type: params.type,
      state: 'queued',
      courseId: params.courseId || null,
      moduleId: params.moduleId || null,
      lessonId: params.lessonId || null,
      sourceId: params.sourceId || null,
      progress: 0,
      currentStage: initialStage,
      idempotencyKey: params.idempotencyKey || null,
      input: params.input,
      result: null,
      error: null,
      attemptCount: 0,
      maxAttempts: 3,
      model: null,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(jobId, job);

    const createdSteps: JobStepDTO[] = [];
    params.steps.forEach((s, idx) => {
      const stepId = crypto.randomUUID();
      const step: JobStepDTO = {
        id: stepId,
        jobId,
        seq: s.seq ?? idx + 1,
        key: s.key,
        label: s.label,
        state: 'pending',
        attemptCount: 0,
        maxAttempts: s.maxAttempts ?? 3,
        dependsOn: s.dependsOn ?? [],
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: null,
        input: s.input ?? {},
        output: null,
        error: null,
        startedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.steps.set(stepId, step);
      createdSteps.push(step);
    });

    await this.recomputeJob(jobId);
    const updatedJob = this.jobs.get(jobId)!;
    return { ...updatedJob, steps: this.getJobSteps(jobId) };
  }

  async addSteps(jobId: string, stepsInput: EnqueueStepInput[]): Promise<JobStepDTO[]> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const now = new Date().toISOString();
    const existingSteps = this.getJobSteps(jobId);
    let maxSeq = existingSteps.reduce((max, s) => Math.max(max, s.seq), 0);

    const resultSteps: JobStepDTO[] = [];

    for (const s of stepsInput) {
      const existing = existingSteps.find((es) => es.key === s.key);
      if (existing) {
        resultSteps.push(existing);
        continue;
      }

      maxSeq += 1;
      const stepId = crypto.randomUUID();
      const step: JobStepDTO = {
        id: stepId,
        jobId,
        seq: s.seq ?? maxSeq,
        key: s.key,
        label: s.label,
        state: 'pending',
        attemptCount: 0,
        maxAttempts: s.maxAttempts ?? 3,
        dependsOn: s.dependsOn ?? [],
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: null,
        input: s.input ?? {},
        output: null,
        error: null,
        startedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.steps.set(stepId, step);
      resultSteps.push(step);
    }

    await this.recomputeJob(jobId);
    return resultSteps;
  }

  async claimNextStep(workerId: string, lockSeconds = 300): Promise<JobStepDTO | null> {
    const now = new Date();
    const lockExpiry = new Date(now.getTime() - lockSeconds * 1000);

    const runnableJobs = Array.from(this.jobs.values()).filter(
      (j) => j.state === 'queued' || j.state === 'running' || j.state === 'retrying'
    );

    if (runnableJobs.length === 0) return null;

    const jobMap = new Map(runnableJobs.map((j) => [j.id, j]));

    const candidateSteps = Array.from(this.steps.values())
      .filter((s) => jobMap.has(s.jobId))
      .sort((a, b) => a.seq - b.seq);

    for (const step of candidateSteps) {
      const parentJob = jobMap.get(step.jobId)!;

      const isLocked = step.lockedAt && new Date(step.lockedAt) > lockExpiry;

      if (step.state === 'running' && isLocked) {
        continue;
      }

      if (step.state !== 'pending' && step.state !== 'running') {
        continue;
      }

      if (step.nextAttemptAt && new Date(step.nextAttemptAt) > now) {
        continue;
      }

      const jobSteps = this.getJobSteps(step.jobId);
      const depsSatisfied = step.dependsOn.every((depKey) => {
        const depStep = jobSteps.find((js) => js.key === depKey);
        return depStep && (depStep.state === 'completed' || depStep.state === 'skipped');
      });

      if (!depsSatisfied) continue;

      const nowIso = now.toISOString();
      step.state = 'running';
      step.lockedAt = nowIso;
      step.lockedBy = workerId;
      step.startedAt = step.startedAt || nowIso;
      step.attemptCount += 1;
      step.updatedAt = nowIso;

      parentJob.state = 'running';
      parentJob.startedAt = parentJob.startedAt || nowIso;
      parentJob.updatedAt = nowIso;

      return { ...step };
    }

    return null;
  }

  async completeStep(
    stepId: string,
    output: Record<string, unknown>,
    meta?: { model?: string; usage?: { inputTokens?: number; outputTokens?: number }; estimatedCostUsd?: number }
  ): Promise<JobStepDTO> {
    const step = this.steps.get(stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);

    const now = new Date().toISOString();
    step.state = 'completed';
    step.output = meta ? { ...output, _meta: meta } : output;
    step.error = null;
    step.completedAt = now;
    step.updatedAt = now;

    await this.recomputeJob(step.jobId);
    return { ...step };
  }

  async failStep(stepId: string, error: string, opts?: { retryable?: boolean }): Promise<JobStepDTO> {
    const step = this.steps.get(stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);

    const now = new Date();
    const isRetryable = opts?.retryable !== false && step.attemptCount < step.maxAttempts;

    if (isRetryable) {
      const backoffMs = Math.pow(2, step.attemptCount) * 2000;
      step.state = 'pending';
      step.nextAttemptAt = new Date(now.getTime() + backoffMs).toISOString();
      step.error = error;
      step.lockedAt = null;
      step.lockedBy = null;
      step.updatedAt = now.toISOString();

      const job = this.jobs.get(step.jobId);
      if (job && job.state !== 'cancelled' && job.state !== 'paused') {
        job.state = 'retrying';
        job.updatedAt = now.toISOString();
      }
    } else {
      step.state = 'failed';
      step.error = error;
      step.lockedAt = null;
      step.lockedBy = null;
      step.nextAttemptAt = null;
      step.updatedAt = now.toISOString();

      await this.recomputeJob(step.jobId);
    }

    return { ...step };
  }

  async recomputeJob(jobId: string): Promise<JobDTO> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const steps = this.getJobSteps(jobId);
    const nonSkippedSteps = steps.filter((s) => s.state !== 'skipped');

    const totalNonSkipped = nonSkippedSteps.length;
    const completedCount = nonSkippedSteps.filter((s) => s.state === 'completed').length;

    const progress =
      totalNonSkipped === 0 ? 100 : Math.round((completedCount / totalNonSkipped) * 100 * 100) / 100;

    let currentStage = job.currentStage;
    const activeStep = steps.find((s) => s.state === 'running' || s.state === 'pending' || s.state === 'failed');
    if (activeStep) {
      currentStage = activeStep.label;
    } else if (completedCount === totalNonSkipped && totalNonSkipped > 0) {
      currentStage = '16 Ready for Review';
    }

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let lastModel = job.model;

    for (const s of steps) {
      if (s.state === 'completed' && s.output) {
        const meta = (s.output as any)._meta;
        if (meta) {
          if (meta.usage?.inputTokens) totalInputTokens += meta.usage.inputTokens;
          if (meta.usage?.outputTokens) totalOutputTokens += meta.usage.outputTokens;
          if (meta.estimatedCostUsd) totalCostUsd += meta.estimatedCostUsd;
          if (meta.model) lastModel = meta.model;
        }
      }
    }

    const nowIso = new Date().toISOString();

    if (job.state !== 'cancelled' && job.state !== 'paused') {
      const allDone = nonSkippedSteps.every((s) => s.state === 'completed' || s.state === 'skipped');
      const hasFailedTerminal = nonSkippedSteps.some((s) => s.state === 'failed');
      const hasRunnable = nonSkippedSteps.some(
        (s) => s.state === 'pending' || s.state === 'running' || (s.nextAttemptAt && new Date(s.nextAttemptAt) > new Date())
      );

      if (allDone && totalNonSkipped > 0) {
        job.state = 'completed';
        job.completedAt = job.completedAt || nowIso;
        job.result = { summary: `${completedCount} of ${totalNonSkipped} steps completed` };
      } else if (hasFailedTerminal && !hasRunnable) {
        job.state = 'failed';
        const failedStep = steps.find((s) => s.state === 'failed');
        job.error = failedStep?.error || 'Step failed';
      }
    }

    job.progress = progress;
    job.currentStage = currentStage;
    job.inputTokens = totalInputTokens;
    job.outputTokens = totalOutputTokens;
    job.estimatedCostUsd = Math.round(totalCostUsd * 1000000) / 1000000;
    if (lastModel) job.model = lastModel;
    job.updatedAt = nowIso;

    return { ...job };
  }

  async cancelJob(jobId: string): Promise<JobDTO> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const now = new Date().toISOString();
    job.state = 'cancelled';
    job.cancelledAt = now;
    job.updatedAt = now;

    for (const step of this.getJobSteps(jobId)) {
      if (step.state === 'pending') {
        step.state = 'cancelled';
        step.updatedAt = now;
      }
    }

    return { ...job };
  }

  async pauseJob(jobId: string): Promise<JobDTO> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.state = 'paused';
    job.updatedAt = new Date().toISOString();
    return { ...job };
  }

  async resumeJob(jobId: string): Promise<JobDTO> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (job.state === 'paused') {
      job.state = 'queued';
      job.updatedAt = new Date().toISOString();
      await this.recomputeJob(jobId);
    }
    return { ...job };
  }

  async retryJob(jobId: string): Promise<JobDTO> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const now = new Date().toISOString();
    for (const step of this.getJobSteps(jobId)) {
      if (step.state === 'failed') {
        step.state = 'pending';
        step.attemptCount = 0;
        step.nextAttemptAt = null;
        step.error = null;
        step.updatedAt = now;
      }
    }

    job.state = 'queued';
    job.error = null;
    job.updatedAt = now;

    await this.recomputeJob(jobId);
    return { ...job };
  }

  async retryStep(stepId: string): Promise<JobStepDTO> {
    const step = this.steps.get(stepId);
    if (!step) throw new Error(`Step ${stepId} not found`);

    const now = new Date().toISOString();
    step.state = 'pending';
    step.attemptCount = 0;
    step.nextAttemptAt = null;
    step.error = null;
    step.updatedAt = now;

    const job = this.jobs.get(step.jobId);
    if (job) {
      job.state = 'queued';
      job.error = null;
      job.updatedAt = now;
      await this.recomputeJob(job.id);
    }

    return { ...step };
  }

  async getJob(jobId: string): Promise<JobDTO | null> {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : null;
  }

  async getJobWithSteps(jobId: string): Promise<JobWithSteps | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    const steps = this.getJobSteps(jobId);
    return { ...job, steps };
  }

  async getStep(stepId: string): Promise<JobStepDTO | null> {
    const step = this.steps.get(stepId);
    return step ? { ...step } : null;
  }

  async listJobs(filter: JobStoreListFilter): Promise<{ items: JobDTO[]; nextCursor: string | null }> {
    let items = Array.from(this.jobs.values());

    if (filter.organizationId) {
      items = items.filter((j) => j.organizationId === filter.organizationId);
    }
    if (filter.createdBy) {
      items = items.filter((j) => j.createdBy === filter.createdBy);
    }
    if (filter.state) {
      const states = Array.isArray(filter.state) ? filter.state : [filter.state];
      items = items.filter((j) => states.includes(j.state));
    }
    if (filter.type) {
      items = items.filter((j) => j.type === filter.type);
    }
    if (filter.courseId) {
      items = items.filter((j) => j.courseId === filter.courseId);
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = filter.limit || 50;
    let startIndex = 0;
    if (filter.cursor) {
      const cursorIndex = items.findIndex((j) => j.id === filter.cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const pageItems = items.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < items.length;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;

    return { items: pageItems.map((j) => ({ ...j })), nextCursor };
  }

  private getJobSteps(jobId: string): JobStepDTO[] {
    return Array.from(this.steps.values())
      .filter((s) => s.jobId === jobId)
      .sort((a, b) => a.seq - b.seq)
      .map((s) => ({ ...s }));
  }
}

/**
 * Supabase Postgres implementation of JobStore.
 * Interacts with `generation_jobs`, `generation_job_steps`, and RPC `claim_next_job_step`.
 */
export class SupabaseJobStore implements JobStore {
  constructor(private client: SupabaseClient) {}

  async enqueueJob(params: EnqueueJobParams): Promise<JobWithSteps> {
    if (params.idempotencyKey) {
      const { data: existing } = await this.client
        .from('generation_jobs')
        .select('*')
        .eq('organization_id', params.organizationId)
        .eq('idempotency_key', params.idempotencyKey)
        .not('state', 'in', '("failed","cancelled")')
        .maybeSingle();

      if (existing) {
        const { data: steps } = await this.client
          .from('generation_job_steps')
          .select('*')
          .eq('job_id', existing.id)
          .order('seq', { ascending: true });

        return {
          ...mapJobRowToDTO(existing),
          steps: (steps || []).map(mapStepRowToDTO),
        };
      }
    }

    const initialStage = params.steps[0]?.label || '01 Validate Sources';

    const { data: jobRow, error: jobErr } = await this.client
      .from('generation_jobs')
      .insert({
        organization_id: params.organizationId,
        created_by: params.createdBy,
        type: params.type,
        state: 'queued',
        course_id: params.courseId || null,
        module_id: params.moduleId || null,
        lesson_id: params.lessonId || null,
        source_id: params.sourceId || null,
        progress: 0,
        current_stage: initialStage,
        idempotency_key: params.idempotencyKey || null,
        input: params.input,
        attempt_count: 0,
        max_attempts: 3,
      })
      .select()
      .single();

    if (jobErr || !jobRow) {
      throw new Error(`Failed to enqueue job: ${jobErr?.message || 'Unknown error'}`);
    }

    const stepInserts = params.steps.map((s, idx) => ({
      job_id: jobRow.id,
      seq: s.seq ?? idx + 1,
      key: s.key,
      label: s.label,
      state: 'pending',
      attempt_count: 0,
      max_attempts: s.maxAttempts ?? 3,
      depends_on: s.dependsOn ?? [],
      input: s.input ?? {},
    }));

    const { data: stepRows, error: stepErr } = await this.client
      .from('generation_job_steps')
      .insert(stepInserts)
      .select();

    if (stepErr) {
      throw new Error(`Failed to insert job steps: ${stepErr.message}`);
    }

    const jobDto = mapJobRowToDTO(jobRow);
    const stepDtos = (stepRows || []).map(mapStepRowToDTO).sort((a, b) => a.seq - b.seq);

    return { ...jobDto, steps: stepDtos };
  }

  async addSteps(jobId: string, stepsInput: EnqueueStepInput[]): Promise<JobStepDTO[]> {
    const { data: existingSteps } = await this.client
      .from('generation_job_steps')
      .select('*')
      .eq('job_id', jobId);

    const maxSeq = (existingSteps || []).reduce((max, s) => Math.max(max, s.seq), 0);

    const newStepInserts: any[] = [];
    let currentSeq = maxSeq;

    for (const s of stepsInput) {
      const exists = (existingSteps || []).some((es) => es.key === s.key);
      if (!exists) {
        currentSeq += 1;
        newStepInserts.push({
          job_id: jobId,
          seq: s.seq ?? currentSeq,
          key: s.key,
          label: s.label,
          state: 'pending',
          attempt_count: 0,
          max_attempts: s.maxAttempts ?? 3,
          depends_on: s.dependsOn ?? [],
          input: s.input ?? {},
        });
      }
    }

    if (newStepInserts.length > 0) {
      await this.client.from('generation_job_steps').upsert(newStepInserts, { onConflict: 'job_id,key' });
    }

    await this.recomputeJob(jobId);

    const { data: allSteps } = await this.client
      .from('generation_job_steps')
      .select('*')
      .eq('job_id', jobId)
      .order('seq', { ascending: true });

    return (allSteps || []).map(mapStepRowToDTO);
  }

  async claimNextStep(workerId: string, lockSeconds = 300): Promise<JobStepDTO | null> {
    const { data, error } = await this.client.rpc('claim_next_job_step', {
      p_worker: workerId,
      p_lock_seconds: lockSeconds,
    });

    if (error || !data) {
      return null;
    }

    const stepRow = Array.isArray(data) ? data[0] : data;
    if (!stepRow) return null;

    return mapStepRowToDTO(stepRow);
  }

  async completeStep(
    stepId: string,
    output: Record<string, unknown>,
    meta?: { model?: string; usage?: { inputTokens?: number; outputTokens?: number }; estimatedCostUsd?: number }
  ): Promise<JobStepDTO> {
    const now = new Date().toISOString();
    const finalOutput = meta ? { ...output, _meta: meta } : output;

    const { data, error } = await this.client
      .from('generation_job_steps')
      .update({
        state: 'completed',
        output: finalOutput,
        error: null,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', stepId)
      .select()
      .single();

    if (error || !data) throw new Error(`Failed to complete step ${stepId}: ${error?.message}`);

    await this.recomputeJob(data.job_id);
    return mapStepRowToDTO(data);
  }

  async failStep(stepId: string, errorMsg: string, opts?: { retryable?: boolean }): Promise<JobStepDTO> {
    const { data: step } = await this.client.from('generation_job_steps').select('*').eq('id', stepId).single();
    if (!step) throw new Error(`Step ${stepId} not found`);

    const now = new Date();
    const attemptCount = step.attempt_count;
    const maxAttempts = step.max_attempts || 3;
    const isRetryable = opts?.retryable !== false && attemptCount < maxAttempts;

    if (isRetryable) {
      const backoffMs = Math.pow(2, attemptCount) * 2000;
      const nextAttemptAt = new Date(now.getTime() + backoffMs).toISOString();

      const { data: updated } = await this.client
        .from('generation_job_steps')
        .update({
          state: 'pending',
          next_attempt_at: nextAttemptAt,
          error: errorMsg,
          locked_at: null,
          locked_by: null,
          updated_at: now.toISOString(),
        })
        .eq('id', stepId)
        .select()
        .single();

      await this.client
        .from('generation_jobs')
        .update({ state: 'retrying', updated_at: now.toISOString() })
        .eq('id', step.job_id);

      return mapStepRowToDTO(updated);
    } else {
      const { data: updated } = await this.client
        .from('generation_job_steps')
        .update({
          state: 'failed',
          error: errorMsg,
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
          updated_at: now.toISOString(),
        })
        .eq('id', stepId)
        .select()
        .single();

      await this.recomputeJob(step.job_id);
      return mapStepRowToDTO(updated);
    }
  }

  async recomputeJob(jobId: string): Promise<JobDTO> {
    const { data: jobRow } = await this.client.from('generation_jobs').select('*').eq('id', jobId).single();
    if (!jobRow) throw new Error(`Job ${jobId} not found`);

    const { data: stepRows } = await this.client
      .from('generation_job_steps')
      .select('*')
      .eq('job_id', jobId)
      .order('seq', { ascending: true });

    const steps = (stepRows || []).map(mapStepRowToDTO);
    const nonSkipped = steps.filter((s) => s.state !== 'skipped');
    const totalNonSkipped = nonSkipped.length;
    const completedCount = nonSkipped.filter((s) => s.state === 'completed').length;

    const progress =
      totalNonSkipped === 0 ? 100 : Math.round((completedCount / totalNonSkipped) * 100 * 100) / 100;

    let currentStage = jobRow.current_stage;
    const activeStep = steps.find((s) => s.state === 'running' || s.state === 'pending' || s.state === 'failed');
    if (activeStep) {
      currentStage = activeStep.label;
    } else if (completedCount === totalNonSkipped && totalNonSkipped > 0) {
      currentStage = '16 Ready for Review';
    }

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUsd = 0;
    let lastModel = jobRow.model;

    for (const s of steps) {
      if (s.state === 'completed' && s.output) {
        const meta = (s.output as any)._meta;
        if (meta) {
          if (meta.usage?.inputTokens) totalInputTokens += meta.usage.inputTokens;
          if (meta.usage?.outputTokens) totalOutputTokens += meta.usage.outputTokens;
          if (meta.estimatedCostUsd) totalCostUsd += meta.estimatedCostUsd;
          if (meta.model) lastModel = meta.model;
        }
      }
    }

    const updates: Record<string, unknown> = {
      progress,
      current_stage: currentStage,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      estimated_cost_usd: Math.round(totalCostUsd * 1000000) / 1000000,
      updated_at: new Date().toISOString(),
    };
    if (lastModel) updates.model = lastModel;

    if (jobRow.state !== 'cancelled' && jobRow.state !== 'paused') {
      const allDone = nonSkipped.every((s) => s.state === 'completed' || s.state === 'skipped');
      const hasFailedTerminal = nonSkipped.some((s) => s.state === 'failed');
      const hasRunnable = nonSkipped.some(
        (s) => s.state === 'pending' || s.state === 'running' || (s.nextAttemptAt && new Date(s.nextAttemptAt) > new Date())
      );

      if (allDone && totalNonSkipped > 0) {
        updates.state = 'completed';
        updates.completed_at = jobRow.completed_at || new Date().toISOString();
        updates.result = { summary: `${completedCount} of ${totalNonSkipped} steps completed` };
      } else if (hasFailedTerminal && !hasRunnable) {
        updates.state = 'failed';
        const failedStep = steps.find((s) => s.state === 'failed');
        updates.error = failedStep?.error || 'Step failed';
      }
    }

    const { data: updatedJob } = await this.client
      .from('generation_jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();

    return mapJobRowToDTO(updatedJob);
  }

  async cancelJob(jobId: string): Promise<JobDTO> {
    const now = new Date().toISOString();
    const { data: updatedJob } = await this.client
      .from('generation_jobs')
      .update({ state: 'cancelled', cancelled_at: now, updated_at: now })
      .eq('id', jobId)
      .select()
      .single();

    await this.client
      .from('generation_job_steps')
      .update({ state: 'cancelled', updated_at: now })
      .eq('job_id', jobId)
      .eq('state', 'pending');

    return mapJobRowToDTO(updatedJob);
  }

  async pauseJob(jobId: string): Promise<JobDTO> {
    const { data: updatedJob } = await this.client
      .from('generation_jobs')
      .update({ state: 'paused', updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .select()
      .single();

    return mapJobRowToDTO(updatedJob);
  }

  async resumeJob(jobId: string): Promise<JobDTO> {
    const { data: jobRow } = await this.client.from('generation_jobs').select('state').eq('id', jobId).single();
    if (jobRow?.state === 'paused') {
      await this.client
        .from('generation_jobs')
        .update({ state: 'queued', updated_at: new Date().toISOString() })
        .eq('id', jobId);
      return this.recomputeJob(jobId);
    }

    return this.getJob(jobId) as Promise<JobDTO>;
  }

  async retryJob(jobId: string): Promise<JobDTO> {
    const now = new Date().toISOString();
    await this.client
      .from('generation_job_steps')
      .update({
        state: 'pending',
        attempt_count: 0,
        next_attempt_at: null,
        error: null,
        updated_at: now,
      })
      .eq('job_id', jobId)
      .eq('state', 'failed');

    await this.client
      .from('generation_jobs')
      .update({ state: 'queued', error: null, updated_at: now })
      .eq('id', jobId);

    return this.recomputeJob(jobId);
  }

  async retryStep(stepId: string): Promise<JobStepDTO> {
    const now = new Date().toISOString();
    const { data: updatedStep } = await this.client
      .from('generation_job_steps')
      .update({
        state: 'pending',
        attempt_count: 0,
        next_attempt_at: null,
        error: null,
        updated_at: now,
      })
      .eq('id', stepId)
      .select()
      .single();

    if (updatedStep) {
      await this.client
        .from('generation_jobs')
        .update({ state: 'queued', error: null, updated_at: now })
        .eq('id', updatedStep.job_id);
      await this.recomputeJob(updatedStep.job_id);
    }

    return mapStepRowToDTO(updatedStep);
  }

  async getJob(jobId: string): Promise<JobDTO | null> {
    const { data } = await this.client.from('generation_jobs').select('*').eq('id', jobId).maybeSingle();
    return data ? mapJobRowToDTO(data) : null;
  }

  async getJobWithSteps(jobId: string): Promise<JobWithSteps | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const { data: stepRows } = await this.client
      .from('generation_job_steps')
      .select('*')
      .eq('job_id', jobId)
      .order('seq', { ascending: true });

    return {
      ...job,
      steps: (stepRows || []).map(mapStepRowToDTO),
    };
  }

  async getStep(stepId: string): Promise<JobStepDTO | null> {
    const { data } = await this.client.from('generation_job_steps').select('*').eq('id', stepId).maybeSingle();
    return data ? mapStepRowToDTO(data) : null;
  }

  async listJobs(filter: JobStoreListFilter): Promise<{ items: JobDTO[]; nextCursor: string | null }> {
    let query = this.client.from('generation_jobs').select('*');

    if (filter.organizationId) query = query.eq('organization_id', filter.organizationId);
    if (filter.createdBy) query = query.eq('created_by', filter.createdBy);
    if (filter.state) {
      if (Array.isArray(filter.state)) query = query.in('state', filter.state);
      else query = query.eq('state', filter.state);
    }
    if (filter.type) query = query.eq('type', filter.type);
    if (filter.courseId) query = query.eq('course_id', filter.courseId);

    query = query.order('created_at', { ascending: false });

    const limit = filter.limit || 50;
    query = query.limit(limit + 1);

    const { data } = await query;
    const rows = data || [];
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(mapJobRowToDTO);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }
}

function mapJobRowToDTO(row: any): JobDTO {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    type: row.type,
    state: row.state,
    courseId: row.course_id,
    moduleId: row.module_id,
    lessonId: row.lesson_id,
    sourceId: row.source_id,
    progress: Number(row.progress || 0),
    currentStage: row.current_stage || '',
    idempotencyKey: row.idempotency_key,
    input: row.input,
    result: row.result,
    error: row.error,
    attemptCount: row.attempt_count || 0,
    maxAttempts: row.max_attempts || 3,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    estimatedCostUsd: row.estimated_cost_usd != null ? Number(row.estimated_cost_usd) : null,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStepRowToDTO(row: any): JobStepDTO {
  return {
    id: row.id,
    jobId: row.job_id,
    seq: row.seq,
    key: row.key,
    label: row.label,
    state: row.state,
    attemptCount: row.attempt_count || 0,
    maxAttempts: row.max_attempts || 3,
    dependsOn: row.depends_on || [],
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    nextAttemptAt: row.next_attempt_at,
    input: row.input,
    output: row.output,
    error: row.error,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
