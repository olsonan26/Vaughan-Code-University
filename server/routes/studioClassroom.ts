/** Instructor Classroom management: placement tree, items, modules, lessons, locks, catalog import. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import { getServiceClient } from '../lib/supabase.js';
import { assertCourseTeam } from '../kate/access.js';
import { importCatalog, SupabaseClassroomImportRepository } from '../classroom/import.js';
import { INITIAL_COURSES } from '../../src/data/initialData.js';

export const studioClassroomRoutes = new Hono<AppEnv>();
studioClassroomRoutes.use('*', requireAuth(), requirePermission('classroom.manage'));
const db = () => getServiceClient();
const ok = <T>(r: { data: T | null; error: any }, what = 'db'): T => { if (r.error) throw new HttpError(500, 'db_error', `${what}: ${r.error.message}`); return r.data as T; };

const kinds = ['video', 'audio', 'pdf', 'reading', 'image', 'quiz', 'resource', 'flashcards', 'worksheet', 'lesson_plan'] as const;
const lockRule = z.discriminatedUnion('type', [
  z.object({ type: z.literal('manual') }),
  z.object({ type: z.literal('after_previous') }),
  z.object({ type: z.literal('after_lesson'), lessonId: z.string().uuid() }),
  z.object({ type: z.literal('after_quiz'), itemId: z.string().uuid(), minScore: z.number().min(0).max(100) }),
  z.object({ type: z.literal('min_level'), level: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal('date'), at: z.string().min(4) }),
]);
const lockInput = z.object({ rule: lockRule, message: z.string().max(300).optional() });

async function nextPos(table: string, col: string, val: string) {
  const r = await db().from(table).select('position').eq(col, val).order('position', { ascending: false }).limit(1).maybeSingle();
  return ((r.data as any)?.position ?? -1) + 1;
}
async function courseOf(table: 'modules' | 'lessons' | 'lesson_items' | 'courses', id: string): Promise<string> {
  if (table === 'courses') return id;
  const r = await db().from(table).select('course_id').eq('id', id).maybeSingle();
  if (!r.data) throw new HttpError(404, 'not_found', `${table} ${id} not found`);
  return (r.data as any).course_id;
}
async function upsertLock(auth: any, courseId: string, entityType: string, entityId: string, rule: unknown, message?: string) {
  const r = await db().from('content_locks').upsert({ organization_id: auth.organizationId, course_id: courseId, entity_type: entityType, entity_id: entityId, rule, message: message ?? null, created_by: auth.userId }, { onConflict: 'entity_type,entity_id' }).select().single();
  return ok(r, 'lock');
}

studioClassroomRoutes.get('/tree', async (c) => {
  const auth = c.get('auth');
  const courses = ok<any[]>(await db().from('courses').select('id, title, course_code, position, classroom_visible').eq('organization_id', auth.organizationId).is('archived_at', null).order('position'));
  const ids = courses.map((x) => x.id);
  const [mods, lessons, items] = ids.length ? await Promise.all([
    db().from('modules').select('id, course_id, title, position').in('course_id', ids).is('archived_at', null).order('position'),
    db().from('lessons').select('id, module_id, title, position').in('course_id', ids).is('archived_at', null).order('position'),
    db().from('lesson_items').select('id, lesson_id, kind, title, position').in('course_id', ids).is('archived_at', null).order('position'),
  ]).then((rs) => rs.map((r) => ok<any[]>(r as any))) : [[], [], []];
  return c.json({
    courses: courses.map((co) => ({
      id: co.id, title: co.title, courseCode: co.course_code, classroomVisible: co.classroom_visible,
      modules: mods.filter((m) => m.course_id === co.id).map((m) => ({
        id: m.id, title: m.title, position: m.position,
        lessons: lessons.filter((l) => l.module_id === m.id).map((l) => {
          const its = items.filter((i) => i.lesson_id === l.id);
          return { id: l.id, title: l.title, position: l.position, itemCount: its.length, items: its.map((i) => ({ id: i.id, kind: i.kind, title: i.title, position: i.position })) };
        }),
      })),
    })),
  });
});

const target = z.object({
  courseId: z.string().uuid(), moduleId: z.string(), newModuleTitle: z.string().max(200).optional(),
  lessonId: z.string(), newLessonTitle: z.string().max(200).optional(),
  kind: z.enum(kinds), slot: z.enum(['main', 'section', 'resource']), position: z.number().int().min(0).optional(),
  lock: lockInput.nullable().optional(),
});
const createItem = z.object({ target, title: z.string().max(300), payload: z.record(z.string(), z.unknown()), sourceRefs: z.array(z.any()).optional(), provenance: z.enum(['instructor', 'ai_source_only', 'ai_with_approved_additions', 'imported']).optional(), published: z.boolean().optional() });

studioClassroomRoutes.post('/items', async (c) => {
  const auth = c.get('auth');
  const b = await parseBody(c, createItem);
  const t = b.target;
  await assertCourseTeam(db(), auth, t.courseId);
  let moduleId = t.moduleId, lessonId = t.lessonId, createdModuleId: string | undefined, createdLessonId: string | undefined;
  if (moduleId === 'new') {
    const m = ok<any>(await db().from('modules').insert({ course_id: t.courseId, title: t.newModuleTitle || 'New module', position: await nextPos('modules', 'course_id', t.courseId) }).select('id').single(), 'module');
    moduleId = createdModuleId = m.id;
  }
  if (lessonId === 'new') {
    const lessonType = ['video', 'audio', 'pdf', 'quiz'].includes(t.kind) ? t.kind : 'article';
    const l = ok<any>(await db().from('lessons').insert({ course_id: t.courseId, module_id: moduleId, title: t.newLessonTitle || b.title || 'New lesson', type: lessonType, position: await nextPos('lessons', 'module_id', moduleId) }).select('id').single(), 'lesson');
    lessonId = createdLessonId = l.id;
  }
  const payload = { ...b.payload, kind: t.kind };
  const item = ok<any>(await db().from('lesson_items').insert({
    organization_id: auth.organizationId, course_id: t.courseId, lesson_id: lessonId, kind: t.kind, slot: t.slot,
    position: t.position ?? await nextPos('lesson_items', 'lesson_id', lessonId), title: b.title, payload,
    source_refs: b.sourceRefs ?? [], provenance: b.provenance ?? 'instructor', published: b.published ?? true, created_by: auth.userId,
  }).select().single(), 'item');
  if (t.lock) await upsertLock(auth, t.courseId, createdLessonId ? 'lesson' : 'lesson_item', createdLessonId ?? item.id, t.lock.rule, t.lock.message);
  return c.json({ item, createdModuleId, createdLessonId }, 201);
});

const patchItem = z.object({ expectedVersion: z.number().int(), title: z.string().max(300).optional(), payload: z.record(z.string(), z.unknown()).optional(), published: z.boolean().optional(), position: z.number().int().min(0).optional() });
studioClassroomRoutes.patch('/items/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  const b = await parseBody(c, patchItem);
  const cur = ok<any>(await db().from('lesson_items').select('id, course_id, version, kind').eq('id', id).maybeSingle());
  if (!cur) throw new HttpError(404, 'not_found', 'Item not found');
  await assertCourseTeam(db(), auth, cur.course_id);
  if (cur.version !== b.expectedVersion) throw new HttpError(409, 'version_conflict', 'This item changed since you opened it. Reload and try again.');
  const upd: Record<string, unknown> = { version: cur.version + 1 };
  if (b.title !== undefined) upd.title = b.title;
  if (b.payload !== undefined) upd.payload = { ...b.payload, kind: cur.kind };
  if (b.published !== undefined) upd.published = b.published;
  if (b.position !== undefined) upd.position = b.position;
  const r = ok<any>(await db().from('lesson_items').update(upd).eq('id', id).eq('version', cur.version).select().maybeSingle());
  if (!r) throw new HttpError(409, 'version_conflict', 'This item changed since you opened it.');
  return c.json({ item: r });
});
studioClassroomRoutes.delete('/items/:id', async (c) => {
  const auth = c.get('auth');
  const id = c.req.param('id');
  await assertCourseTeam(db(), auth, await courseOf('lesson_items', id));
  ok(await db().from('lesson_items').update({ archived_at: new Date().toISOString() }).eq('id', id));
  return c.json({ ok: true });
});

studioClassroomRoutes.post('/modules', async (c) => {
  const auth = c.get('auth');
  const b = await parseBody(c, z.object({ courseId: z.string().uuid(), title: z.string().min(1).max(200), description: z.string().max(2000).optional(), position: z.number().int().optional() }));
  await assertCourseTeam(db(), auth, b.courseId);
  const m = ok(await db().from('modules').insert({ course_id: b.courseId, title: b.title, description: b.description ?? null, position: b.position ?? await nextPos('modules', 'course_id', b.courseId) }).select().single());
  return c.json({ module: m }, 201);
});
studioClassroomRoutes.patch('/modules/:id', async (c) => {
  const auth = c.get('auth'); const id = c.req.param('id');
  const b = await parseBody(c, z.object({ title: z.string().min(1).max(200).optional(), description: z.string().max(2000).optional(), position: z.number().int().optional() }));
  await assertCourseTeam(db(), auth, await courseOf('modules', id));
  return c.json({ module: ok(await db().from('modules').update(b).eq('id', id).select().single()) });
});
studioClassroomRoutes.post('/lessons', async (c) => {
  const auth = c.get('auth');
  const b = await parseBody(c, z.object({ moduleId: z.string().uuid(), title: z.string().min(1).max(200), description: z.string().max(2000).optional(), type: z.enum(['video', 'audio', 'pdf', 'quiz', 'article']).optional(), position: z.number().int().optional() }));
  const courseId = await courseOf('modules', b.moduleId);
  await assertCourseTeam(db(), auth, courseId);
  const l = ok(await db().from('lessons').insert({ course_id: courseId, module_id: b.moduleId, title: b.title, description: b.description ?? null, type: b.type ?? 'article', position: b.position ?? await nextPos('lessons', 'module_id', b.moduleId) }).select().single());
  return c.json({ lesson: l }, 201);
});
studioClassroomRoutes.patch('/lessons/:id', async (c) => {
  const auth = c.get('auth'); const id = c.req.param('id');
  const b = await parseBody(c, z.object({ title: z.string().min(1).max(200).optional(), description: z.string().max(2000).optional(), position: z.number().int().optional(), durationMinutes: z.number().int().optional(), xpReward: z.number().int().optional() }));
  await assertCourseTeam(db(), auth, await courseOf('lessons', id));
  const { durationMinutes, xpReward, ...rest } = b;
  const upd: Record<string, unknown> = { ...rest };
  if (durationMinutes !== undefined) upd.duration_minutes = durationMinutes;
  if (xpReward !== undefined) upd.xp_reward = xpReward;
  return c.json({ lesson: ok(await db().from('lessons').update(upd).eq('id', id).select().single()) });
});

const entityTable = { course: 'courses', module: 'modules', lesson: 'lessons', lesson_item: 'lesson_items' } as const;
const lockBody = z.object({ entityType: z.enum(['course', 'module', 'lesson', 'lesson_item']), entityId: z.string().uuid(), rule: lockRule, message: z.string().max(300).optional() });
studioClassroomRoutes.put('/locks', requirePermission('content.lock'), async (c) => {
  const auth = c.get('auth');
  const b = await parseBody(c, lockBody);
  const courseId = await courseOf(entityTable[b.entityType], b.entityId);
  await assertCourseTeam(db(), auth, courseId);
  return c.json({ lock: await upsertLock(auth, courseId, b.entityType, b.entityId, b.rule, b.message) });
});
studioClassroomRoutes.delete('/locks', requirePermission('content.lock'), async (c) => {
  const auth = c.get('auth');
  const entityType = c.req.query('entityType') as keyof typeof entityTable; const entityId = c.req.query('entityId') ?? '';
  if (!entityTable[entityType] || !entityId) throw new HttpError(400, 'invalid_input', 'entityType and entityId are required');
  await assertCourseTeam(db(), auth, await courseOf(entityTable[entityType], entityId));
  ok(await db().from('content_locks').delete().eq('entity_type', entityType).eq('entity_id', entityId));
  return c.json({ ok: true });
});

studioClassroomRoutes.post('/import', async (c) => {
  const auth = c.get('auth');
  if (!auth.roles.some((r) => r === 'headmaster' || r === 'admin')) throw new HttpError(403, 'forbidden', 'Only the Headmaster can import the catalog');
  const counts = await importCatalog(new SupabaseClassroomImportRepository(db()), auth.organizationId, INITIAL_COURSES as any, { ownerUserId: auth.userId });
  return c.json({ counts });
});
