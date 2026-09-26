import { Hono } from 'hono';
import type { AppEnv } from './context.js';
import { registerRoutes } from './routes/index.js';

/** The portable API application. Runs on Vercel (api/[[...route]].ts) and locally (server/dev.ts). */
export function createApp() {
  const app = new Hono<AppEnv>().basePath('/api');
  app.get('/health', (c) => c.json({ ok: true, service: 'vaughan-code-university', time: new Date().toISOString() }));
  registerRoutes(app);
  return app;
}
