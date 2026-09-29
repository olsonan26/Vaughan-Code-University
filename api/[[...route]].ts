/**
 * Single Vercel Function serving the whole API (/api/*).
 * All logic lives in server/ (portable Hono app); this file is only the Vercel adapter.
 */
import { handle } from 'hono/vercel';
import { createApp } from '../server/app.js';

const app = createApp();

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
