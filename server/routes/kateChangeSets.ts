import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { parseBody } from '../lib/validate.js';
import { apply, getView, revert } from '../kate/changeSets.js';
import { assertCourseTeam } from '../kate/access.js';
import { kateDeps } from '../kate/runtime.js';

export const kateChangeSetRoutes = new Hono<AppEnv>();
kateChangeSetRoutes.use('*', requireAuth(), requirePermission('kate.use'));

async function load(c: any) {
  const auth = c.get('auth');
  const deps = kateDeps(auth, 'kate.changes');
  const view = await getView(deps as any, c.req.param('id'));
  await assertCourseTeam(deps.db, auth, view.courseId);
  return { deps, view };
}
kateChangeSetRoutes.get('/:id', async (c) => c.json((await load(c)).view));
kateChangeSetRoutes.post('/:id/apply', async (c) => {
  const { deps } = await load(c);
  const b = await parseBody(c, z.object({ overrideAudit: z.boolean().optional() }));
  return c.json(await apply(deps as any, c.req.param('id'), { overrideAudit: b.overrideAudit }));
});
kateChangeSetRoutes.post('/:id/revert', async (c) => {
  const { deps } = await load(c);
  return c.json(await revert(deps as any, c.req.param('id')));
});
