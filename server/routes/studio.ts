import { Hono } from 'hono';
import type { AppEnv } from '../context.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getServiceClient } from '../lib/supabase.js';
import { HttpError } from '../lib/errors.js';
import type { StudioOverview } from '../../shared/studio/overview.js';

export const studioRoutes = new Hono<AppEnv>();
studioRoutes.use('*', requireAuth());

/** Dashboard summary. Every number is a real query, scoped to what this user may see. */
studioRoutes.get('/overview', requirePermission('studio.access'), async (c) => {
  const auth = c.get('auth');
  const db = getServiceClient();
  const org = auth.organizationId;
  const all = auth.can('course.edit_all');

  // courses I own or collaborate on (or all, for admins)
  let courseQuery = db.from('courses').select('id, title, thumbnail_url, state, updated_at, created_by')
    .eq('organization_id', org).neq('state', 'archived').order('updated_at', { ascending: false }).limit(24);
  if (!all) {
    const { data: collab } = await db.from('course_collaborators').select('course_id').eq('user_id', auth.userId);
    const ids = (collab ?? []).map((r: any) => r.course_id);
    courseQuery = ids.length ? courseQuery.or(`created_by.eq.${auth.userId},id.in.(${ids.join(',')})`) : courseQuery.eq('created_by', auth.userId);
  }
  const { data: courses, error } = await courseQuery;
  if (error) throw new HttpError(500, 'db_error', error.message);
  const courseIds = (courses ?? []).map((x: any) => x.id);
  const none = ['00000000-0000-0000-0000-000000000000'];
  const ids = courseIds.length ? courseIds : none;

  const [modules, lessons, sections, slots, audits, sources, jobs] = await Promise.all([
    db.from('modules').select('id, course_id').in('course_id', ids),
    db.from('lessons').select('id, course_id').in('course_id', ids).is('archived_at', null),
    db.from('lesson_sections').select('lesson_id, lessons!inner(course_id)').in('lessons.course_id', ids),
    db.from('visual_slots').select('id, course_id, lesson_id, status, necessity').in('course_id', ids).in('status', ['missing', 'prompt_ready']),
    db.from('quality_audits').select('id, course_id').in('course_id', ids),
    (() => {
      let q = db.from('knowledge_sources').select('id, title, processing_state, authority_level, created_at').eq('organization_id', org).is('archived_at', null)
        .order('created_at', { ascending: false }).limit(6);
      if (!auth.can('knowledge.manage_all')) q = q.eq('created_by', auth.userId);
      return q;
    })(),
    (() => {
      let q = db.from('generation_jobs').select('id, type, state, progress, current_stage, course_id').eq('organization_id', org)
        .in('state', ['queued', 'running', 'retrying', 'paused']).order('created_at', { ascending: false }).limit(10);
      if (!auth.can('admin.jobs')) q = q.eq('created_by', auth.userId);
      return q;
    })(),
  ]);

  const auditIds = (audits.data ?? []).map((a: any) => a.id);
  const findings = auditIds.length
    ? await db.from('quality_findings').select('audit_id, severity').in('audit_id', auditIds).eq('status', 'open')
    : { data: [] as any[] };
  const auditCourse = new Map((audits.data ?? []).map((a: any) => [a.id, a.course_id]));

  const count = <T,>(rows: T[] | null | undefined, key: (r: T) => string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
    return m;
  };
  const modulesBy = count(modules.data as any[], (r: any) => r.course_id);
  const lessonsBy = count(lessons.data as any[], (r: any) => r.course_id);
  const lessonsWithContent = new Map<string, Set<string>>();
  for (const s of (sections.data ?? []) as any[]) {
    const cid = s.lessons?.course_id;
    if (!cid) continue;
    if (!lessonsWithContent.has(cid)) lessonsWithContent.set(cid, new Set());
    lessonsWithContent.get(cid)!.add(s.lesson_id);
  }
  const missingBy = count(slots.data as any[], (r: any) => r.course_id);
  const issuesBy = count(findings.data as any[], (r: any) => auditCourse.get(r.audit_id) ?? '');
  const titleById = new Map((courses ?? []).map((x: any) => [x.id, x.title]));

  const overview: StudioOverview = {
    courses: (courses ?? []).map((x: any) => {
      const total = lessonsBy.get(x.id) ?? 0;
      return {
        id: x.id, title: x.title, coverUrl: x.thumbnail_url ?? null, status: x.state,
        moduleCount: modulesBy.get(x.id) ?? 0, lessonCount: total,
        percentComplete: total ? Math.round(((lessonsWithContent.get(x.id)?.size ?? 0) / total) * 100) : null,
        openIssues: issuesBy.get(x.id) ?? 0, missingVisuals: missingBy.get(x.id) ?? 0, updatedAt: x.updated_at,
      };
    }),
    recentSources: (sources.data ?? []).map((s: any) => ({ id: s.id, title: s.title, status: s.processing_state, authority: s.authority_level, createdAt: s.created_at })),
    activeJobs: (jobs.data ?? []).map((j: any) => ({ id: j.id, type: j.type, state: j.state, progress: j.progress ?? 0, currentStage: j.current_stage, courseTitle: j.course_id ? titleById.get(j.course_id) ?? null : null })),
    attention: [],
    missingVisuals: { total: (slots.data ?? []).length, nextHref: null },
  };

  const failedSources = (sources.data ?? []).filter((s: any) => s.processing_state === 'failed').length;
  if (failedSources) overview.attention.push({ kind: 'source_failed', label: 'sources failed processing', count: failedSources, href: '/instructor/knowledge?state=failed' });
  const critical = (findings.data ?? []).filter((f: any) => f.severity === 'critical').length;
  if (critical) overview.attention.push({ kind: 'critical_findings', label: 'critical quality issues', count: critical, href: '/instructor/quality' });
  const essentialMissing = (slots.data ?? []).filter((s: any) => s.necessity === 'essential').length;
  if (essentialMissing) overview.attention.push({ kind: 'essential_visuals', label: 'essential visuals missing', count: essentialMissing, href: '/instructor/visuals' });
  const next = (slots.data ?? [])[0] as any;
  if (next) overview.missingVisuals.nextHref = `/instructor/course/${next.course_id}/visuals`;

  return c.json(overview);
});
