/** Classroom read model: loads published classroom content from Postgres and shapes it per viewer. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassroomCourse, ClassroomLesson, ClassroomModule, ClassroomResponse, LessonItem, LockRule, LockState } from '../../shared/classroom/types.js';
import { applyParentLocks, buildLockState, type LockEvalContext } from '../../shared/classroom/locks.js';
import { HttpError } from '../lib/errors.js';

export interface Viewer { userId: string | null; organizationId: string; isInstructor: boolean; level: number }

export interface ClassroomData {
  courses: any[]; modules: any[]; lessons: any[]; items: any[]; locks: any[];
  completedLessonIds: Set<string>; bestScores: Map<string, number>;
}

function check<T>(r: { data: T | null; error: any }): T {
  if (r.error) throw new HttpError(500, 'db_error', r.error.message);
  return (r.data ?? []) as T;
}

export async function defaultOrganizationId(db: SupabaseClient): Promise<string> {
  const r = await db.from('organizations').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (r.error) throw new HttpError(500, 'db_error', r.error.message);
  if (!r.data) throw new HttpError(503, 'not_configured', 'No organization exists yet');
  return (r.data as any).id;
}

export async function viewerLevel(db: SupabaseClient, userId: string | null): Promise<number> {
  if (!userId) return 1;
  const r = await db.from('profiles').select('level').eq('id', userId).maybeSingle();
  return Math.max(1, Number((r.data as any)?.level ?? 1));
}

export async function loadClassroomData(db: SupabaseClient, viewer: Viewer, onlyCourseId?: string): Promise<ClassroomData> {
  let cq = db.from('courses').select('id, legacy_id, course_code, title, slug, tagline, description, thumbnail_url, badge, category, required_tier, required_level, position')
    .eq('organization_id', viewer.organizationId).eq('classroom_visible', true).is('archived_at', null);
  if (onlyCourseId) cq = cq.eq('id', onlyCourseId);
  const courses = check<any[]>(await cq);
  const ids = courses.map((c) => c.id);
  if (!ids.length) return { courses: [], modules: [], lessons: [], items: [], locks: [], completedLessonIds: new Set(), bestScores: new Map() };
  const [modules, lessons, items, locks] = await Promise.all([
    db.from('modules').select('id, course_id, legacy_id, title, description, position').in('course_id', ids).is('archived_at', null),
    db.from('lessons').select('id, course_id, module_id, legacy_id, title, description, type, duration_minutes, xp_reward, position, is_pro_only, locked_level').in('course_id', ids).is('archived_at', null),
    (() => { let q = db.from('lesson_items').select('id, course_id, lesson_id, kind, slot, position, title, payload, source_refs, provenance, published, version').in('course_id', ids).is('archived_at', null); if (!viewer.isInstructor) q = q.eq('published', true); return q; })(),
    db.from('content_locks').select('id, course_id, entity_type, entity_id, rule, message').in('course_id', ids),
  ]).then((rs) => rs.map((r) => check<any[]>(r as any)));
  const completedLessonIds = new Set<string>();
  const bestScores = new Map<string, number>();
  if (viewer.userId) {
    const [prog, att] = await Promise.all([
      db.from('lesson_progress').select('lesson_id, status').eq('user_id', viewer.userId).in('course_id', ids),
      db.from('item_attempts').select('item_id, score_percent').eq('user_id', viewer.userId),
    ]);
    for (const p of check<any[]>(prog as any)) if (p.status === 'completed') completedLessonIds.add(p.lesson_id);
    for (const a of check<any[]>(att as any)) bestScores.set(a.item_id, Math.max(bestScores.get(a.item_id) ?? 0, a.score_percent));
  }
  return { courses, modules, lessons, items, locks, completedLessonIds, bestScores };
}

const byPos = (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0) || String(a.title ?? '').localeCompare(String(b.title ?? ''));

/** Strip answer keys from quiz payloads for students. */
export function studentSafePayload(payload: any, isInstructor: boolean) {
  if (isInstructor || payload?.kind !== 'quiz') return payload;
  return { ...payload, questions: (payload.questions ?? []).map(({ correctOptionIds: _c, explanation: _e, ...q }: any) => q) };
}

export function shapeClassroom(data: ClassroomData, viewer: Viewer): ClassroomResponse {
  const lockMap = new Map<string, any>();
  for (const l of data.locks) lockMap.set(`${l.entity_type}:${l.entity_id}`, l);
  const titles = new Map<string, string>();
  for (const l of data.lessons) titles.set(l.id, l.title);
  for (const i of data.items) titles.set(i.id, i.title ?? i.kind);

  const courses: ClassroomCourse[] = [...data.courses].sort(byPos).map((c) => {
    const mods = data.modules.filter((m) => m.course_id === c.id).sort(byPos);
    const orderedLessonIds: string[] = [];
    for (const m of mods) for (const l of data.lessons.filter((x) => x.module_id === m.id).sort(byPos)) orderedLessonIds.push(l.id);
    const ctxFor = (lessonId?: string): LockEvalContext => ({ viewerLevel: viewer.level, completedLessonIds: data.completedLessonIds, bestScores: data.bestScores, now: new Date(), orderedLessonIds, currentLessonId: lessonId, titles });
    const lockFor = (type: string, id: string, lessonId?: string): LockState | null => {
      const row = lockMap.get(`${type}:${id}`);
      return row ? buildLockState({ id: row.id, rule: row.rule as LockRule, message: row.message }, ctxFor(lessonId), viewer.isInstructor) : null;
    };
    const modules: ClassroomModule[] = mods.map((m) => ({
      id: m.id, legacyId: m.legacy_id, title: m.title, description: m.description, position: m.position,
      lock: lockFor('module', m.id),
      lessons: data.lessons.filter((l) => l.module_id === m.id).sort(byPos).map((l): ClassroomLesson => {
        let lock = lockFor('lesson', l.id, l.id);
        if (!lock && l.locked_level && l.locked_level > 1) {
          lock = buildLockState({ id: `level:${l.id}`, rule: { type: 'min_level', level: l.locked_level } }, ctxFor(l.id), viewer.isInstructor);
        }
        const items: LessonItem[] = data.items.filter((i) => i.lesson_id === l.id).sort(byPos).map((i) => ({
          id: i.id, lessonId: i.lesson_id, kind: i.kind, slot: i.slot, position: i.position, title: i.title,
          payload: studentSafePayload(i.payload, viewer.isInstructor), sourceRefs: viewer.isInstructor ? (i.source_refs ?? []) : [],
          provenance: i.provenance, published: i.published, version: i.version, lock: lockFor('lesson_item', i.id, l.id),
        }));
        return {
          id: l.id, legacyId: l.legacy_id, moduleId: l.module_id, title: l.title, description: l.description, type: l.type,
          durationMinutes: l.duration_minutes, xpReward: l.xp_reward, position: l.position, isProOnly: !!l.is_pro_only, lockedLevel: l.locked_level,
          items, lock, completed: data.completedLessonIds.has(l.id),
        };
      }),
    }));
    return {
      id: c.id, legacyId: c.legacy_id, courseCode: c.course_code, title: c.title, slug: c.slug, tagline: c.tagline, description: c.description,
      thumbnailUrl: c.thumbnail_url, badge: c.badge, category: c.category, requiredTier: c.required_tier ?? 'free', requiredLevel: c.required_level ?? 1,
      position: c.position ?? 0, modules, lock: lockFor('course', c.id),
    };
  });
  return { courses: applyParentLocks(courses), viewer: { userId: viewer.userId, isInstructor: viewer.isInstructor, level: viewer.level } };
}

/** Find a lesson (and whether it is locked for this viewer). */
export function findLesson(resp: ClassroomResponse, lessonId: string) {
  for (const c of resp.courses) for (const m of c.modules) for (const l of m.lessons) if (l.id === lessonId) return { course: c, module: m, lesson: l };
  return null;
}
export function findItem(resp: ClassroomResponse, itemId: string) {
  for (const c of resp.courses) for (const m of c.modules) for (const l of m.lessons) for (const i of l.items) if (i.id === itemId) return { course: c, module: m, lesson: l, item: i };
  return null;
}
export const isBlocked = (...locks: (LockState | null | undefined)[]) => locks.some((l) => l?.locked);

/** Server-side quiz grading: exact set match per question. */
export function gradeQuiz(payload: any, answers: Record<string, string[]>) {
  const qs: any[] = payload?.questions ?? [];
  const results = qs.map((q) => {
    const given = [...new Set(answers[q.id] ?? [])].sort();
    const right = [...new Set<string>(q.correctOptionIds ?? [])].sort();
    return { questionId: q.id, correct: given.length === right.length && given.every((g, i) => g === right[i]), correctOptionIds: right, explanation: q.explanation ?? null };
  });
  const scorePercent = qs.length ? Math.round((results.filter((r) => r.correct).length / qs.length) * 100) : 0;
  const pass = Number(payload?.passingScorePercent ?? 70);
  return { scorePercent, passed: scorePercent >= pass, results };
}
