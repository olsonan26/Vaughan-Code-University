/** Wire contracts shared by server and client. */

export interface ApiErrorBody {
  error: {
    code: string; // e.g. 'unauthorized', 'forbidden', 'not_found', 'validation_failed', 'conflict', 'rate_limited', 'ai_unavailable', 'internal'
    message: string; // human-readable, specific ("Lesson 4.2 generation failed ... Retry Lesson 4.2.")
    details?: unknown;
    retryable?: boolean;
  };
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export type JobState = 'queued' | 'running' | 'paused' | 'retrying' | 'completed' | 'failed' | 'cancelled';
export type JobStepState = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
