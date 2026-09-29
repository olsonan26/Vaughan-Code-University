import { apiFetch } from '../../services/api/client';

export type BuildStatus = 'outlining' | 'awaiting_approval' | 'writing' | 'assembling' | 'ready' | 'applied' | 'failed' | 'cancelled';
export interface BPLesson { key: string; title: string; focus: string; objectives: string[]; keyTerms: string[]; chunkIds: string[]; pages?: string }
export interface BPModule { key: string; title: string; description: string; lessons: BPLesson[] }
export interface Blueprint {
  courseTitle: string; description: string; outcomes: string[]; modules: BPModule[];
  uncovered: { chunkIds: string[]; why: string; preview: string }[]; gaps: string[];
  stats: { passages: number; covered: number; skipped: number };
}
export interface BuildLesson {
  key: string; moduleKey: string; title: string; status: 'queued' | 'writing' | 'practice' | 'checking' | 'revising' | 'done' | 'failed';
  error: string | null; note: string | null;
  audit: { passed: boolean; unsupportedClaims: { text: string; reason: string }[]; gaps: string[]; revised: boolean } | null;
  reading: { markdown: string; objectives: string[] } | null;
  practice: { questions: { id: string; prompt: string; type: string; options: { id: string; text: string }[]; correctOptionIds: string[]; explanation?: string }[]; cards: { front: string; back: string }[]; worksheet: string | null } | null;
}
export interface Build {
  id: string; status: BuildStatus; target: 'new' | 'existing'; courseId: string | null;
  course: { id: string; title: string; course_code: string | null; classroom_visible: boolean; state: string } | null;
  newCourse: { title?: string; code?: string; tier?: string }; options: { quizzes?: boolean; flashcards?: boolean; worksheets?: boolean; lockInOrder?: boolean; instruction?: string };
  sourceIds: string[]; blueprint: Blueprint | null; changeSetId: string | null; error: string | null;
  job: { id: string; state: string; progress: number; stage: string } | null; lessons: BuildLesson[]; createdAt: string; updatedAt: string;
}
export interface BuildSummary { id: string; status: BuildStatus; title: string; modules: number; lessons: number; error: string | null; sourceCount: number; createdAt: string; courseId: string | null }
export interface CreateBuild {
  sourceIds: string[]; target: 'new' | 'existing'; courseId?: string;
  newCourse: { title?: string; code?: string; tier: 'free' | 'pro' | 'vip' };
  options: { quizzes: boolean; flashcards: boolean; worksheets: boolean; lockInOrder: boolean; instruction?: string };
}

export const builderApi = {
  list: () => apiFetch<{ builds: BuildSummary[] }>('/studio/builds'),
  create: (b: CreateBuild) => apiFetch<{ id: string }>('/studio/builds', { method: 'POST', json: b }),
  get: (id: string) => apiFetch<Build>(`/studio/builds/${id}`),
  saveBlueprint: (id: string, blueprint: Blueprint) => apiFetch<{ blueprint: Blueprint }>(`/studio/builds/${id}/blueprint`, { method: 'PUT', json: { blueprint } }),
  approve: (id: string, blueprint: Blueprint) => apiFetch<{ courseId: string }>(`/studio/builds/${id}/approve`, { method: 'POST', json: { blueprint } }),
  rewrite: (id: string, key: string, note: string) => apiFetch<{ ok: true }>(`/studio/builds/${id}/lessons/${key}/rewrite`, { method: 'POST', json: { note } }),
  apply: (id: string, overrideAudit: boolean) => apiFetch<{ courseId: string }>(`/studio/builds/${id}/apply`, { method: 'POST', json: { overrideAudit } }),
  publish: (id: string, visible: boolean) => apiFetch<{ visible: boolean }>(`/studio/builds/${id}/publish`, { method: 'POST', json: { visible } }),
  cancel: (id: string) => apiFetch<{ ok: true }>(`/studio/builds/${id}/cancel`, { method: 'POST' }),
  sources: () => apiFetch<any>('/knowledge/sources?limit=200'),
  courses: () => apiFetch<{ courses: { id: string; title: string; courseCode: string | null }[] }>('/studio/classroom/tree'),
};

export const STATUS_LABEL: Record<BuildStatus, string> = {
  outlining: 'Kate is reading your source', awaiting_approval: 'Outline ready for your review', writing: 'Writing lessons', assembling: 'Assembling the course',
  ready: 'Ready to add to the Classroom', applied: 'In the Classroom', failed: 'Needs attention', cancelled: 'Cancelled',
};

/** Pure blueprint edits (unit-tested). Every edit keeps each passage in at most one lesson. */
export const bp = {
  clone: (b: Blueprint): Blueprint => JSON.parse(JSON.stringify(b)),
  moveLesson(b: Blueprint, mi: number, li: number, dir: -1 | 1): Blueprint {
    const n = bp.clone(b); const mod = n.modules[mi]; const j = li + dir;
    if (j >= 0 && j < mod.lessons.length) { [mod.lessons[li], mod.lessons[j]] = [mod.lessons[j], mod.lessons[li]]; return n; }
    // move across module boundary
    const target = n.modules[mi + dir]; if (!target) return b;
    const [l] = mod.lessons.splice(li, 1);
    if (dir < 0) target.lessons.push(l); else target.lessons.unshift(l);
    if (!mod.lessons.length) n.modules.splice(mi, 1);
    return n;
  },
  mergeWithNext(b: Blueprint, mi: number, li: number): Blueprint {
    const n = bp.clone(b); const mod = n.modules[mi]; const a = mod.lessons[li]; const z = mod.lessons[li + 1]; if (!a || !z) return b;
    a.chunkIds = [...a.chunkIds, ...z.chunkIds.filter((id) => !a.chunkIds.includes(id))];
    a.focus = `${a.focus} ${z.focus}`.trim(); a.objectives = [...new Set([...a.objectives, ...z.objectives])]; a.keyTerms = [...new Set([...a.keyTerms, ...z.keyTerms])];
    if (a.pages && z.pages) a.pages = `${a.pages}; ${z.pages}`;
    mod.lessons.splice(li + 1, 1); return n;
  },
  removeLesson(b: Blueprint, mi: number, li: number): Blueprint {
    const n = bp.clone(b); n.modules[mi].lessons.splice(li, 1); if (!n.modules[mi].lessons.length) n.modules.splice(mi, 1); return n;
  },
  splitModuleAt(b: Blueprint, mi: number, li: number): Blueprint {
    const n = bp.clone(b); const mod = n.modules[mi]; if (li <= 0 || li >= mod.lessons.length) return b;
    const rest = mod.lessons.splice(li);
    n.modules.splice(mi + 1, 0, { key: `m_new_${Date.now()}`, title: `${mod.title} (continued)`, description: '', lessons: rest }); return n;
  },
  mergeModuleWithNext(b: Blueprint, mi: number): Blueprint {
    const n = bp.clone(b); const z = n.modules[mi + 1]; if (!z) return b;
    n.modules[mi].lessons.push(...z.lessons); n.modules.splice(mi + 1, 1); return n;
  },
  lessonCount: (b: Blueprint) => b.modules.reduce((k, m) => k + m.lessons.length, 0),
  covered: (b: Blueprint) => new Set(b.modules.flatMap((m) => m.lessons.flatMap((l) => l.chunkIds))).size,
};
