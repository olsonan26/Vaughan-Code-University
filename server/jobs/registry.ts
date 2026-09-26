import type { JobDTO, JobStepDTO } from '../../shared/jobs/types.js';
import type { JobStore } from './store.js';

export interface StepHandlerContext {
  job: JobDTO;
  step: JobStepDTO;
  input: any;
  deps: {
    db: JobStore;
    gateway?: any;
    logger?: any;
  };
  reportProgress: (partial: number) => Promise<void>;
  isCancelled: () => Promise<boolean>;
}

export interface StepHandlerResult {
  output: Record<string, unknown>;
  meta?: {
    model?: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
    };
    estimatedCostUsd?: number;
  };
}

export type StepHandler = (ctx: StepHandlerContext) => Promise<StepHandlerResult>;

export type StepKeyMatcher = string | RegExp | ((key: string) => boolean);

interface RegistryEntry {
  jobType: string;
  matcher: StepKeyMatcher;
  handler: StepHandler;
}

const registry: RegistryEntry[] = [];

/**
 * Register a step handler for a specific job type and step key pattern.
 *
 * CONTRACT REQUIREMENT:
 * Handlers MUST be idempotent. Because worker steps can be retried after timeouts, network errors,
 * or worker crashes, step execution must use stable keys (e.g. course_id, lesson_id, section_id)
 * and upsert/overwrite DB records rather than append duplicates.
 */
export function registerStepHandler(jobType: string, matcher: StepKeyMatcher, handler: StepHandler): void {
  registry.push({ jobType, matcher, handler });
}

export function getStepHandler(jobType: string, stepKey: string): StepHandler | null {
  for (const entry of registry) {
    if (entry.jobType !== '*' && entry.jobType !== jobType) {
      continue;
    }

    if (typeof entry.matcher === 'string') {
      if (entry.matcher === '*' || entry.matcher === stepKey) {
        return entry.handler;
      }
    } else if (entry.matcher instanceof RegExp) {
      if (entry.matcher.test(stepKey)) {
        return entry.handler;
      }
    } else if (typeof entry.matcher === 'function') {
      if (entry.matcher(stepKey)) {
        return entry.handler;
      }
    }
  }

  return null;
}

export function clearStepHandlers(): void {
  registry.length = 0;
  registerBuiltinHandlers();
}

/** Built-in fallback 'noop' / 'test' handler used in tests and mock runs. */
export const noopStepHandler: StepHandler = async (ctx) => {
  return {
    output: {
      success: true,
      message: `Executed step ${ctx.step.key} for job ${ctx.job.id}`,
      echoedInput: ctx.input,
    },
    meta: {
      model: 'mock-model-v1',
      usage: { inputTokens: 100, outputTokens: 50 },
      estimatedCostUsd: 0.001,
    },
  };
};

function registerBuiltinHandlers() {
  registerStepHandler('*', 'noop', noopStepHandler);
  registerStepHandler('*', 'test', noopStepHandler);
  registerStepHandler('test', '*', noopStepHandler);
}

// Register built-in handlers on module load
registerBuiltinHandlers();
