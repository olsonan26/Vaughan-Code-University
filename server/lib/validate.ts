import type { Context } from 'hono';
import { ZodSchema, ZodError } from 'zod';
import { HttpError } from './errors.js';

export async function parseBody<T>(c: Context, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HttpError(400, 'validation_failed', 'Invalid JSON request body');
  }

  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      throw err;
    }
    throw new HttpError(400, 'validation_failed', 'Validation failed');
  }
}

export function parseQuery<T>(c: Context, schema: ZodSchema<T>): T {
  const query = c.req.query();
  try {
    return schema.parse(query);
  } catch (err) {
    if (err instanceof ZodError) {
      throw err;
    }
    throw new HttpError(400, 'validation_failed', 'Invalid query parameters');
  }
}
