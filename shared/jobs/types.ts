import type { JobState, JobStepState } from '../api.js';

export type { JobState, JobStepState };

export const PRD_STAGES = [
  '01 Validate Sources',
  '02 Analyze Knowledge',
  '03 Build Blueprint',
  '04 Validate Prerequisites',
  '05 Module Metadata',
  '06 Lessons',
  '07 Examples',
  '08 Exercises',
  '09 Assessments',
  '10 Flashcards',
  '11 Worksheets',
  '12 Identify Visual Needs',
  '13 Visual Prompts',
  '14 Source Accuracy Audit',
  '15 Consistency Audit',
  '16 Ready for Review',
] as const;

export type PRDStage = (typeof PRD_STAGES)[number];

export const JOB_TYPES = [
  'source.process',
  'course.blueprint',
  'course.generate',
  'lesson.generate',
  'lesson.section.regenerate',
  'assessments.generate',
  'flashcards.generate',
  'worksheets.generate',
  'visuals.identify',
  'visuals.prompt',
  'audit.lesson',
  'audit.course',
  'director.analyze',
  'publish.course',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export interface JobDTO {
  id: string;
  organizationId: string;
  createdBy: string;
  type: JobType | string;
  state: JobState;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  sourceId?: string | null;
  progress: number;
  currentStage: string;
  idempotencyKey?: string | null;
  input: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  attemptCount: number;
  maxAttempts: number;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  estimatedCostUsd?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobStepDTO {
  id: string;
  jobId: string;
  seq: number;
  key: string;
  label: string;
  state: JobStepState;
  attemptCount: number;
  maxAttempts: number;
  dependsOn: string[];
  lockedAt?: string | null;
  lockedBy?: string | null;
  nextAttemptAt?: string | null;
  input: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobWithSteps extends JobDTO {
  steps: JobStepDTO[];
}

export interface EnqueueStepInput {
  key: string;
  label: string;
  seq?: number;
  dependsOn?: string[];
  input?: Record<string, unknown>;
  maxAttempts?: number;
}

export interface EnqueueJobParams {
  organizationId: string;
  createdBy: string;
  type: JobType | string;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  sourceId?: string | null;
  input: Record<string, unknown>;
  idempotencyKey?: string | null;
  steps: EnqueueStepInput[];
}

export interface AddStepsParams {
  jobId: string;
  steps: EnqueueStepInput[];
}
