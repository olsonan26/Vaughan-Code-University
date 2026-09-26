import { getAccessToken } from '../supabase/client';
import type { ApiErrorBody } from '../../../shared/api';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  retryable?: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    retryable?: boolean
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryable =
      retryable ?? (status >= 500 || status === 0 || status === 429);
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  json?: unknown;
  body?: BodyInit | null;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchOptions = {}
): Promise<T> {
  const { json, headers: initHeaders, ...customInit } = init;

  // Normalise path: prepend /api if path starts with / and not /api
  let url = path;
  if (url.startsWith('/') && !url.startsWith('/api/') && url !== '/api') {
    url = `/api${url}`;
  }

  const headers = new Headers(initHeaders || {});

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const token = await getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch {
    // Auth token retrieval failure should not block unauthenticated public requests
  }

  const body = json !== undefined ? JSON.stringify(json) : init.body;

  let res: Response;
  try {
    res = await fetch(url, {
      ...customInit,
      headers,
      body,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network failure';
    throw new ApiError(0, 'network', message, undefined, true);
  }

  if (!res.ok) {
    let errBody: ApiErrorBody | null = null;
    try {
      const text = await res.text();
      errBody = JSON.parse(text) as ApiErrorBody;
    } catch {
      // Body not JSON
    }

    if (errBody?.error?.code && errBody?.error?.message) {
      throw new ApiError(
        res.status,
        errBody.error.code,
        errBody.error.message,
        errBody.error.details,
        errBody.error.retryable
      );
    }

    throw new ApiError(
      res.status,
      res.status === 404 ? 'not_found' : 'http_error',
      res.statusText || `HTTP ${res.status} Error`
    );
  }

  if (res.status === 204) {
    return {} as T;
  }

  const text = await res.text();
  if (!text || text.trim() === '') {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export function uploadToSignedUrl(
  url: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream'
    );
    xhr.setRequestHeader('x-upsert', 'false');

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let code = 'upload_failed';
        let message = `Upload failed with status ${xhr.status}`;
        try {
          const errBody = JSON.parse(xhr.responseText) as ApiErrorBody;
          if (errBody?.error?.message) message = errBody.error.message;
          if (errBody?.error?.code) code = errBody.error.code;
        } catch {
          // ignore parsing error
        }
        reject(new ApiError(xhr.status, code, message));
      }
    };

    xhr.onerror = () => {
      reject(
        new ApiError(
          0,
          'network',
          'Upload failed due to network error',
          undefined,
          true
        )
      );
    };

    xhr.send(file);
  });
}
