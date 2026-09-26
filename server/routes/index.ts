import type { Hono } from 'hono';
import type { AppEnv } from '../context.js';
import { jobsRoutes } from './jobs.js';

/**
 * Route registry. Each feature exports a Hono sub-app and is mounted here.
 */
export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/jobs', jobsRoutes);
}
