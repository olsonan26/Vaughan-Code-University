/**
 * Adapter file for server dependencies.
 * IMPORTANT: The platform coordinator will rewire these imports to server/lib/* and server/middleware/*
 * when those modules are landed by concurrent agents.
 */

import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../context.js';
import type { Permission } from '../../shared/auth/permissions.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '../env.js';

// coordinator rewires to server/lib/errors.js
export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  retryable?: boolean;

  constructor(status: number, code: string, message: string, opts?: { details?: unknown; retryable?: boolean }) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = opts?.details;
    this.retryable = opts?.retryable;
  }
}

// coordinator rewires to server/middleware/auth.js
export function requireAuth(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const authHeader = c.req.header('authorization');
    const authCtx = c.get('auth');
    if (!authHeader && !authCtx) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }
    await next();
  };
}

export function requirePermission(...perms: Permission[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }
    if (perms.length > 0) {
      const hasPerm = perms.every((p) => (auth.can ? auth.can(p) : auth.permissions?.has(p)));
      if (!hasPerm) {
        throw new HttpError(403, 'forbidden', 'Insufficient permissions');
      }
    }
    await next();
  };
}

// coordinator rewires to server/lib/supabase.js
let _serviceClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    const url = serverEnv.supabaseUrl || 'https://placeholder.supabase.co';
    const key = serverEnv.supabaseServiceRoleKey || 'placeholder-key';
    _serviceClient = createClient(url, key);
  }
  return _serviceClient;
}
