import type { ErrorHandler, NotFoundHandler } from 'hono';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '../../shared/api.js';
import type { AppEnv } from '../context.js';

export class HttpError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;
  public retryable?: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { details?: unknown; retryable?: boolean }
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = options?.details;
    this.retryable = options?.retryable;
  }
}

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HttpError) {
    const body: ApiErrorBody = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
        ...(err.retryable !== undefined && { retryable: err.retryable }),
      },
    };
    return c.json(body, err.status as any);
  }

  if (err instanceof ZodError) {
    const body: ApiErrorBody = {
      error: {
        code: 'validation_failed',
        message: 'Validation failed',
        details: { issues: err.issues },
      },
    };
    return c.json(body, 400);
  }

  const requestId = (c.get('requestId') as string | undefined) || 'unknown';
  console.error(`[InternalError] requestId=${requestId}:`, err);

  const body: ApiErrorBody = {
    error: {
      code: 'internal',
      message: `Internal server error (request ID: ${requestId})`,
    },
  };
  return c.json(body, 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  const body: ApiErrorBody = {
    error: {
      code: 'not_found',
      message: 'Route not found',
    },
  };
  return c.json(body, 404);
};
