/** Course Builder API: whole sources -> blueprint (instructor approves) -> fully written, fact-checked course. */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import { getServiceClient } from '../lib/supabase.js';
import { enqueueJob, getJobStore } from '../jobs/queue.js';
import { kickWorker } from './jobs.js';
import { assertCourseTeam } from '../kate/access.js';
import { kateDeps } from '../kate/runtime.js';
import { apply } from '../kate/changeSets.js';
import { writeSteps, type Blueprint } from '../kate/courseBuild.js';

export const courseBuildRoutes = new Hono<AppEnv>();
courseBuildRoutes.use('*', requireAuth(), requirePermission('kate.use'));
const db = () => getServiceClient();
const ok = <T>(r: { data: T | null; error: any }, what = 'db'): T => { if (r.error) throw new HttpError(500, 'db_error', `${what}: ${r.error.message}`); return r.data as T; };

async function own(c: any) {
  const auth = c.get('auth');
  const r = await db().from('course_builds').select('*').eq('id', c.req.param('id')).maybeSingle();
  const b: any = r.data;
  if (!b || b.organization_id !== auth.organizationId) throw new HttpError(404, 'not_found', 'Course build not found');
  if (b.course_id) await assertCourseTeam(db(), auth, b.course_id);
  else if (b.created_by !== auth.userId && !auth.can?.('course.edit_all')) throw new HttpError(403, 'forbidden', 'Not your course build');
  return { auth, b };
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'course';

const createBody = z.object({
  sourceIds: z.array(z.string().uuid()).min(1).max(10),
  target: z.enum(['new', 'existing']).default('new'),
  courseId: z.string().uuid().optional(),
  newCourse: z.object({ title: z.string().max(200).optional(), code: z.string().max(20).optional(), tier: z.enum(['free', 'pro', 'vip']).default('pro') }).default({ tier: 'pro' }),
  options: z.object({ quizzes: z.boolean().default(true), flashcards: z.boolean().default(true), worksheets: z.boolean().default(false), lockInOrder: z.boolean().default(true), instruction: z.string().max(4000).optional() }).default({ quizzes: true, flashcards: true, worksheets: false, lockInOrder: true }),
});

courseBuildRoutes.get('/', async (c) => {
  const auth = c.get('auth');
  const r = await db().from('course_builds').select('id, status, target, course_id, new_course, blueprint, error, created_at, updated_at, source_ids').eq('organization_id', auth.organizationId).order('created_at', { ascending: false }).limit(50);
  const rows = ok(r) as any[];
  return c.json({ builds: rows.map((b) => ({ id: b.id, status: b.status, target: b.target, courseId: b.course_id, title: b.blueprint?.courseTitle ?? b.new_course?.title ?? 'New course', modules: b.blueprint?.modules?.length ?? 0, lessons: (b.blueprint?.modules ?? []).reduce((n: number, m: any) => n + m.lessons.length, 0), error: b.error, sourceCount: b.source_ids?.length ?? 0, createdAt: b.created_at, updatedAt: b.updated_at })) });
});

courseBuildRoutes.post('/', async (c) => {
  const auth = c.get('auth');
  const body = await parseBody(c, createBody);
  const srcs = ok(await db().from('knowledge_sources').select('id, title, organization_id, processing_state, chunk_count').in('id', body.sourceIds)) as any[];
  if (srcs.length !== body.sourceIds.length || srcs.some((s) => s.organization_id !== auth.organizationId)) throw new HttpError(404, 'not_found', 'One of those sources was not found');
  const notReady = srcs.filter((s) => !['ready', 'needs_review'].includes(s.processing_state) || !s.chunk_count);
  if (notReady.length) throw new HttpError(409, 'sources_not_ready', `Still processing: ${notReady.map((s) => s.title).join(', ')}. Wait until they show Ready.`);
  if (body.target === 'existing') {
    if (!body.courseId) throw new HttpError(400, 'invalid_input', 'Pick the course to add to');
    await assertCourseTeam(db(), auth, body.courseId);
  }
  const ordered = body.sourceIds; // instructor's order = teaching order
  const build: any = ok(await db().from('course_builds').insert({
    organization_id: auth.organizationId, created_by: auth.userId, source_ids: ordered, target: body.target,
    course_id: body.target === 'existing' ? body.courseId : null, new_course: body.newCourse, options: body.options, status: 'outlining',
  }).select().single(), 'create build');
  const job = await enqueueJob({ organizationId: auth.organizationId, createdBy: auth.userId, type: 'course.blueprint', courseId: build.course_id, input: { buildId: build.id }, idempotencyKey: `course.blueprint:${build.id}`, steps: [{ key: 'outline', label: 'Read the whole source', seq: 1, input: { buildId: build.id } }] });
  await db().from('course_builds').update({ outline_job_id: job.id }).eq('id', build.id);
  kickWorker(c);
  return c.json({ id: build.id, jobId: job.id }, 201);
});

courseBuildRoutes.get('/:id', async (c) => {
  const { b } = await own(c);
  const lessons = ok(await db().from('course_build_lessons').select('lesson_key, module_key, title, status, reading, practice, audit, instructor_note, error, updated_at').eq('build_id', b.id)) as any[];
  const jobId = ['outlining', 'awaiting_approval'].includes(b.status) ? b.outline_job_id : b.write_job_id;
  let job: any = null;
  if (jobId) {
    const j: any = (await db().from('generation_jobs').select('id, state, progress, current_stage, updated_at').eq('id', jobId).maybeSingle()).data;
    if (j) {
      job = { id: j.id, state: j.state, progress: j.progress, stage: j.current_stage };
      // keep the pipeline moving whenever the instructor is watching
      if (['queued', 'running', 'retrying'].includes(j.state) && Date.now() - new Date(j.updated_at).getTime() > 20000) kickWorker(c);
    }
  }
  const course = b.course_id ? (await db().from('courses').select('id, title, course_code, classroom_visible, state').eq('id', b.course_id).maybeSingle()).data : null;
  return c.json({
    id: b.id, status: b.status, target: b.target, courseId: b.course_id, course, newCourse: b.new_course, options: b.options, sourceIds: b.source_ids,
    blueprint: b.blueprint, changeSetId: b.change_set_id, error: b.error, job, createdAt: b.created_at, updatedAt: b.updated_at,
    lessons: lessons.map((l) => ({ key: l.lesson_key, moduleKey: l.module_key, title: l.title, status: l.status, error: l.error, note: l.instructor_note, audit: l.audit,
      reading: l.reading ? { markdown: l.reading.markdown, objectives: l.reading.objectives } : null,
      practice: l.practice ? { questions: l.practice.questions ?? [], cards: l.practice.cards ?? [], worksheet: l.practice.worksheet?.markdown ?? null } : null })),
  });
});

const lessonShape = z.object({ key: z.string().max(40).optional(), title: z.string().min(1).max(200), focus: z.string().max(4000).default(''), objectives: z.array(z.string().max(500)).max(12).default([]), keyTerms: z.array(z.string().max(200)).max(40).default([]), chunkIds: z.array(z.string().uuid()).min(1), pages: z.string().max(40).optional() });
const blueprintShape = z.object({
  courseTitle: z.string().min(1).max(200), description: z.string().max(4000).default(''), outcomes: z.array(z.string().max(500)).max(12).default([]),
  modules: z.array(z.object({ key: z.string().max(40).optional(), title: z.string().min(1).max(200), description: z.string().max(2000).default(''), lessons: z.array(lessonShape).min(1).max(40) })).min(1).max(40),
});

/** Instructor edits may rename/reorder/move/merge/delete, but never point a lesson at text outside the uploaded sources. */
function sanitizeBlueprint(original: Blueprint, edited: z.infer<typeof blueprintShape>): Blueprint {
  const allowed = new Set<string>([...original.modules.flatMap((m) => m.lessons.flatMap((l) => l.chunkIds)), ...(original.uncovered ?? []).flatMap((u) => u.chunkIds)]);
  let lk = 0;
  const modules = edited.modules.map((m, mi) => ({
    key: `m${mi + 1}`, title: m.title.trim(), description: m.description,
    lessons: m.lessons.map((l) => ({ ...l, key: `l${++lk}`, title: l.title.trim(), chunkIds: [...new Set(l.chunkIds.filter((id) => allowed.has(id)))] })).filter((l) => l.chunkIds.length),
  })).filter((m) => m.lessons.length);
  if (!modules.length) throw new HttpError(400, 'invalid_input', 'The course needs at least one lesson');
  const used = new Set(modules.flatMap((m) => m.lessons.flatMap((l) => l.chunkIds)));
  return { ...original, courseTitle: edited.courseTitle.trim(), description: edited.description, outcomes: edited.outcomes, modules, stats: { ...original.stats, covered: used.size } };
}

courseBuildRoutes.put('/:id/blueprint', async (c) => {
  const { b } = await own(c);
  if (b.status !== 'awaiting_approval') throw new HttpError(409, 'invalid_state', 'The outline can only be edited before writing starts');
  const body = await parseBody(c, z.object({ blueprint: blueprintShape }));
  const blueprint = sanitizeBlueprint(b.blueprint, body.blueprint);
  ok(await db().from('course_builds').update({ blueprint }).eq('id', b.id));
  return c.json({ blueprint });
});

async function startWriting(c: any, auth: any, b: any, keys: string[]) {
  const job = await enqueueJob({ organizationId: auth.organizationId, createdBy: auth.userId, type: 'course.generate', courseId: b.course_id, input: { buildId: b.id }, idempotencyKey: `course.generate:${b.id}:${Date.now()}`, steps: writeSteps(b.id, keys) });
  ok(await db().from('course_builds').update({ status: 'writing', write_job_id: job.id, error: null }).eq('id', b.id));
  kickWorker(c);
  return job;
}

courseBuildRoutes.post('/:id/approve', async (c) => {
  const { auth, b } = await own(c);
  if (b.status !== 'awaiting_approval') throw new HttpError(409, 'invalid_state', `This build is ${b.status}`);
  const body = await parseBody(c, z.object({ blueprint: blueprintShape.optional() }));
  const blueprint: Blueprint = body.blueprint ? sanitizeBlueprint(b.blueprint, body.blueprint) : b.blueprint;
  let courseId = b.course_id;
  if (b.target === 'new' && !courseId) {
    const pos = ((await db().from('courses').select('position').eq('organization_id', auth.organizationId).order('position', { ascending: false }).limit(1).maybeSingle()).data as any)?.position ?? -1;
    const title = String(b.new_course?.title || blueprint.courseTitle).slice(0, 200);
    const course: any = ok(await db().from('courses').insert({
      organization_id: auth.organizationId, created_by: auth.userId, title, slug: `${slugify(title)}-${b.id.slice(0, 6)}`,
      course_code: b.new_course?.code || null, required_tier: b.new_course?.tier ?? 'pro', description: blueprint.description || null,
      learning_outcome: blueprint.outcomes.join('\n') || null, state: 'draft', classroom_visible: false, position: pos + 1, source_mode: 'source_only',
    }).select('id').single(), 'create course');
    courseId = course.id;
  }
  ok(await db().from('course_builds').update({ blueprint, course_id: courseId }).eq('id', b.id));
  ok(await db().from('course_build_lessons').delete().eq('build_id', b.id));
  const rows = blueprint.modules.flatMap((m) => m.lessons.map((l) => ({ build_id: b.id, lesson_key: l.key, module_key: m.key, title: l.title, status: 'queued' })));
  ok(await db().from('course_build_lessons').insert(rows), 'lessons');
  const job = await startWriting(c, auth, { ...b, course_id: courseId }, rows.map((r) => r.lesson_key));
  return c.json({ ok: true, courseId, jobId: job.id });
});

courseBuildRoutes.post('/:id/lessons/:key/rewrite', async (c) => {
  const { auth, b } = await own(c);
  if (!['ready', 'failed'].includes(b.status)) throw new HttpError(409, 'invalid_state', 'Wait until the course has finished writing, then rewrite lessons');
  const key = c.req.param('key');
  const body = await parseBody(c, z.object({ note: z.string().max(4000).optional() }));
  const r = await db().from('course_build_lessons').update({ status: 'queued', instructor_note: body.note ?? null, error: null }).eq('build_id', b.id).eq('lesson_key', key).select('lesson_key');
  if (!ok(r)?.length) throw new HttpError(404, 'not_found', 'Lesson not found in this build');
  // failed lessons are retried together with the requested one
  const failed = ok(await db().from('course_build_lessons').select('lesson_key').eq('build_id', b.id).eq('status', 'failed')) as any[];
  const keys = [...new Set([key, ...failed.map((f) => f.lesson_key)])];
  const job = await startWriting(c, auth, b, keys);
  return c.json({ ok: true, jobId: job.id });
});

courseBuildRoutes.post('/:id/apply', async (c) => {
  const { auth, b } = await own(c);
  if (b.status !== 'ready' || !b.change_set_id) throw new HttpError(409, 'invalid_state', 'The course is not ready to add yet');
  const body = await parseBody(c, z.object({ overrideAudit: z.boolean().optional() }));
  const res = await apply(kateDeps(auth, 'kate.course_builder') as any, b.change_set_id, { overrideAudit: body.overrideAudit });
  ok(await db().from('course_builds').update({ status: 'applied' }).eq('id', b.id));
  return c.json({ ok: true, courseId: b.course_id, changeSet: res.changeSet });
});

courseBuildRoutes.post('/:id/publish', async (c) => {
  const { b } = await own(c);
  if (b.status !== 'applied' || !b.course_id) throw new HttpError(409, 'invalid_state', 'Add the course to the Classroom first');
  const body = await parseBody(c, z.object({ visible: z.boolean() }));
  const patch: any = { classroom_visible: body.visible, updated_at: new Date().toISOString() };
  if (body.visible) patch.state = 'published';
  ok(await db().from('courses').update(patch).eq('id', b.course_id));
  return c.json({ ok: true, visible: body.visible });
});

courseBuildRoutes.post('/:id/cancel', async (c) => {
  const { b } = await own(c);
  if (['applied', 'cancelled'].includes(b.status)) return c.json({ ok: true });
  for (const j of [b.outline_job_id, b.write_job_id].filter(Boolean)) await getJobStore().cancelJob(j).catch(() => {});
  ok(await db().from('course_builds').update({ status: 'cancelled' }).eq('id', b.id));
  return c.json({ ok: true });
});
