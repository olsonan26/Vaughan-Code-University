import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import { runKate } from '../kate/agent.js';
import { SupabaseKateRepository } from '../kate/threads.js';
import { katePorts } from '../kate/wiring.js';
import { kateDeps } from '../kate/runtime.js';
import { assertCourseTeam } from '../kate/access.js';
import { openRouterConfigured } from '../ai/providers/openrouter.js';

export const kateRoutes = new Hono<AppEnv>();
kateRoutes.use('*', requireAuth(), requirePermission('kate.use'));
kateRoutes.use('*', async (_c, next) => {
  if (!openRouterConfigured()) throw new HttpError(503, 'not_configured', 'Kate is not configured: add OPENROUTER_API_KEY on the server.');
  await next();
});

function ctx(c: any) {
  const auth = c.get('auth');
  const deps = kateDeps(auth);
  return { auth, deps, repo: new SupabaseKateRepository(deps.db) };
}
async function ownThread(c: any, id: string) {
  const { auth, repo } = ctx(c);
  const t = await repo.getThread(id, auth.organizationId);
  if (!t || t.userId !== auth.userId) throw new HttpError(404, 'not_found', 'Conversation not found');
  return t;
}
const kateError = (e: any): never => {
  if (e instanceof HttpError) throw e;
  throw new HttpError(e?.status ?? 502, e?.code ?? 'kate_error', e?.message ?? 'Kate ran into a problem');
};

const context = z.object({ courseId: z.string().optional(), moduleId: z.string().optional(), lessonId: z.string().optional(), sourceIds: z.array(z.string()).optional(), placement: z.any().optional() }).partial();

kateRoutes.post('/threads', async (c) => {
  const { auth, repo } = ctx(c);
  const b = await parseBody(c, z.object({ courseId: z.string().uuid().optional(), sourceId: z.string().uuid().optional(), title: z.string().max(200).optional(), context: z.record(z.string(), z.any()).optional() }));
  const thread = await repo.createThread({ organizationId: auth.organizationId, userId: auth.userId, ...b });
  return c.json({ thread }, 201);
});
kateRoutes.get('/threads', async (c) => {
  const { auth, repo } = ctx(c);
  return c.json({ threads: await repo.listThreads(auth.organizationId, auth.userId, 30) });
});
kateRoutes.get('/threads/:id', async (c) => {
  const thread = await ownThread(c, c.req.param('id'));
  return c.json({ thread, messages: await ctx(c).repo.getMessagesView(thread.id, 200) });
});
kateRoutes.post('/threads/:id/messages', async (c) => {
  const thread = await ownThread(c, c.req.param('id'));
  const { deps, repo } = ctx(c);
  const b = await parseBody(c, z.object({ content: z.string().min(1).max(8000), context: context.optional() }));
  try { return c.json({ messages: await runKate(deps as any, katePorts, repo, thread.id, b.content, b.context ?? {}) }); }
  catch (e) { return kateError(e); }
});
kateRoutes.post('/checklist', async (c) => {
  const { deps, repo } = ctx(c);
  const b = await parseBody(c, z.object({ sourceIds: z.array(z.string().uuid()).min(1).max(10), threadId: z.string().uuid().optional() }));
  try {
    const checklist = await katePorts.getChecklistBuilder().buildChecklist(b.sourceIds, deps as any);
    if (b.threadId) {
      await ownThread(c, b.threadId);
      await repo.addMessage({ threadId: b.threadId, role: 'assistant', content: `I went through your whole upload. ${checklist.summary}\n\nHere's what I can do with it. Tick what you want and I'll ask where each piece goes.`, data: { checklist } });
    }
    return c.json(checklist);
  } catch (e) { return kateError(e); }
});
const generateBody = z.object({
  action: z.string(),
  threadId: z.string().uuid().optional(),
  input: z.object({ courseId: z.string().uuid(), sourceIds: z.array(z.string().uuid()).min(1), instruction: z.string().max(8000).optional(), placement: z.any(), allowBeyondSource: z.boolean().default(false), approvedAdditions: z.array(z.string()).optional(), lock: z.any().optional() }),
});
kateRoutes.post('/generate', async (c) => {
  const { auth, deps, repo } = ctx(c);
  const b = await parseBody(c, generateBody);
  await assertCourseTeam(deps.db, auth, b.input.courseId);
  if (b.threadId) await ownThread(c, b.threadId);
  try {
    const draft = await katePorts.getGenerator(b.action as any).generate({ ...b.input, organizationId: auth.organizationId, userId: auth.userId, placement: { ...b.input.placement, courseId: b.input.courseId } } as any, deps as any);
    const saved: any = await katePorts.saveDraft(deps as any, draft, b.threadId);
    if (b.threadId) await repo.addMessage({ threadId: b.threadId, role: 'assistant', content: `I prepared "${draft.title}". ${draft.summary} Review it and click Apply when it looks right.`, data: { changeSetId: saved.id, lockQuestion: { changeSetId: saved.id } } });
    return c.json({ changeSet: saved });
  } catch (e) { return kateError(e); }
});
