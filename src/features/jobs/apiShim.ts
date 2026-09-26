/**
 * Temporary API shim for jobs feature.
 * COORDINATOR REWIRES TO: src/services/api/client.ts
 */

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  retryable?: boolean;

  constructor(status: number, code: string, message: string, opts?: { details?: unknown; retryable?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = opts?.details;
    this.retryable = opts?.retryable;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.json) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
    body: init?.json ? JSON.stringify(init.json) : init?.body,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    const errObj = errorData?.error || {};
    throw new ApiError(
      response.status,
      errObj.code || 'http_error',
      errObj.message || `HTTP ${response.status} ${response.statusText}`,
      { details: errObj.details, retryable: errObj.retryable }
    );
  }

  return response.json() as Promise<T>;
}
