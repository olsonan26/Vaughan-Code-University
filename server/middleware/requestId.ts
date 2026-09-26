import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../context.js';

export const requestIdMiddleware = (): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const existingId = c.req.header('X-Request-ID');
    const requestId = existingId || crypto.randomUUID();
    c.set('requestId', requestId);
    c.header('X-Request-ID', requestId);
    await next();
  };
};
