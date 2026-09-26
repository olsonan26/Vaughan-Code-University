/** Local API server: `bun run dev:api` (Vite proxies /api here). No Vercel or Base44 required. */
import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const { createApp } = await import('./app.js');
const port = Number(process.env.PORT || 8787);
serve({ fetch: createApp().fetch, port });
console.log(`VCU API listening on http://localhost:${port}/api`);
