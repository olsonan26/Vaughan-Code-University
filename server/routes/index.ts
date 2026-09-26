import type { Hono } from 'hono';
import type { AppEnv } from '../context.js';

/**
 * Route registry. Each feature exports a Hono sub-app and is mounted here by the coordinator.
 * Convention: `export const knowledgeRoutes = new Hono<AppEnv>()` in server/routes/knowledge.ts,
 * mounted at '/knowledge' => final path '/api/knowledge/...'.
 */
export function registerRoutes(app: Hono<AppEnv>) {
  void app;
}
