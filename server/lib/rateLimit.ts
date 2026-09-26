import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../context.js';
import { getServiceClient } from './supabase.js';
import { HttpError } from './errors.js';

export interface RateLimitOptions {
  bucket: string;
  windowSeconds: number;
  max: number;
}

const memoryBuckets = new Map<string, { count: number; expiresAt: number }>();

export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  max: number
): Promise<boolean> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc('hit_rate_limit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });

    if (error) {
      return checkMemoryRateLimit(key, windowSeconds, max);
    }

    return Boolean(data);
  } catch {
    return checkMemoryRateLimit(key, windowSeconds, max);
  }
}

function checkMemoryRateLimit(key: string, windowSeconds: number, max: number): boolean {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.expiresAt <= now) {
    memoryBuckets.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return true;
  }

  if (existing.count >= max) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const userId = c.get('auth')?.userId || c.req.header('x-forwarded-for') || 'anonymous';
    const key = `${options.bucket}:${userId}`;

    const allowed = await checkRateLimit(key, options.windowSeconds, options.max);
    if (!allowed) {
      throw new HttpError(
        429,
        'rate_limited',
        `Rate limit exceeded for bucket '${options.bucket}'. Please wait before retrying.`,
        { retryable: true }
      );
    }

    await next();
  };
}
