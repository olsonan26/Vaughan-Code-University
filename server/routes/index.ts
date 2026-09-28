import type { Hono } from 'hono';
import type { AppEnv } from '../context.js';
import { meRoutes } from './me.js';
import { adminRoutes } from './admin.js';
import { jobsRoutes } from './jobs.js';
import { knowledgeRoutes } from './knowledge.js';
import { studioRoutes } from './studio.js';
import { registerKnowledgeHandlers } from '../knowledge/processor.js';

registerKnowledgeHandlers();

/**
 * Route registry. Each feature exports a Hono sub-app and is mounted here.
 * Final paths are /api/<mount>/...
 */
export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/me', meRoutes);
  app.route('/admin', adminRoutes);
  app.route('/jobs', jobsRoutes);
  app.route('/knowledge', knowledgeRoutes);
  app.route('/studio', studioRoutes);
}
