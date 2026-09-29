import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import { getServiceClient } from '../lib/supabase.js';
import { defaultOrganizationId, findItem, findLesson, gradeQuiz, isBlocked, loadClassroomData, shapeClassroom, viewerLevel, type Viewer } from '../classroom/read.js';

export const classroomRoutes = new Hono<AppEnv>();
const db = () => getServiceClient();

async function viewerFor(c: any): Promise<Viewer> {
  const auth = c.get('auth');
  if (!auth) return { userId: null, organizationId: await defaultOrganizationId(db()), isInstructor: false, level: 1 };
  return { userId: auth.userId, organizationId: auth.organizationId, isInstructor: auth.can('classroom.manage'), level: await viewerLevel(db(), auth.userId) };
}

classroomRoutes.get('/courses', optionalAuth(), async (c) => {
  const viewer = await viewerFor(c);
  return c.json(shapeClassroom(await loadClassroomData(db(), viewer), viewer));
});

classroomRoutes.post('/lessons/:id/complete', requireAuth(), async (c) => {
  const viewer = await viewerFor(c);
  const id = c.req.param('id');
  const l = await db().from('lessons').select('course_id').eq('id', id).maybeSingle();
  if (!l.data) throw new HttpError(404, 'not_found', 'Lesson not found');
  const found = findLesson(shapeClassroom(await loadClassroomData(db(), viewer, (l.data as any).course_id), viewer), id);
  if (!found) throw new HttpError(404, 'not_found', 'Lesson not found');
  if (isBlocked(found.course.lock, found.module.lock, found.lesson.lock)) throw new HttpError(403, 'locked', found.lesson.lock?.reason || 'This lesson is locked');
  const now = new Date().toISOString();
  const r = await db().from('lesson_progress').upsert({ organization_id: viewer.organizationId, user_id: viewer.userId, course_id: found.course.id, lesson_id: id, status: 'completed', completed_at: now, last_accessed_at: now }, { onConflict: 'user_id,lesson_id' });
  if (r.error) throw new HttpError(500, 'db_error', r.error.message);
  return c.json({ ok: true });
});

const attemptSchema = z.object({ answers: z.record(z.string(), z.array(z.string())) });
classroomRoutes.post('/items/:id/attempt', requireAuth(), async (c) => {
  const viewer = await viewerFor(c);
  const body = await parseBody(c, attemptSchema);
  const id = c.req.param('id');
  const row = await db().from('lesson_items').select('id, course_id, kind, payload').eq('id', id).is('archived_at', null).maybeSingle();
  if (!row.data || (row.data as any).kind !== 'quiz') throw new HttpError(404, 'not_found', 'Quiz not found');
  const found = findItem(shapeClassroom(await loadClassroomData(db(), viewer, (row.data as any).course_id), viewer), id);
  if (!found) throw new HttpError(404, 'not_found', 'Quiz not found');
  if (isBlocked(found.course.lock, found.module.lock, found.lesson.lock, found.item.lock)) throw new HttpError(403, 'locked', 'This quiz is locked');
  const graded = gradeQuiz((row.data as any).payload, body.answers);
  const ins = await db().from('item_attempts').insert({ organization_id: viewer.organizationId, user_id: viewer.userId, item_id: id, score_percent: graded.scorePercent, passed: graded.passed, answers: body.answers });
  if (ins.error) throw new HttpError(500, 'db_error', ins.error.message);
  return c.json(graded);
});
