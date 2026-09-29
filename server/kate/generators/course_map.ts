import type { GeneratorInput, ChangeSetDraft, ChangeOp } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { askWriter, finalize, gatherEvidence, rules } from './engine.js';

/** Maps a long source (e.g. a book PDF) onto the course: modules + empty lessons following the source's chapters. */
export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  const ev = await gatherEvidence(input, deps, { whole: true, maxTokens: 150_000 });
  const mods = await deps.db.from('modules').select('id, title, position').eq('course_id', input.courseId).is('archived_at', null).order('position');
  const existing = (mods.data ?? []) as { id: string; title: string }[];
  const out = await askWriter(deps,
    `You are Kate's course architect. Map the source's chapters/sections onto a course structure. Follow the source's order. Reuse an existing module when its title clearly matches (give its id).\n${rules(input)}\nReturn {"modules": [{"title": string, "existingModuleId": string|null, "lessons": [{"title": string, "summary": string, "sources": ["S1"]}]}], "gaps": [string]}.`,
    `Existing modules in this course: ${JSON.stringify(existing)}\nInstructor request: ${input.instruction || 'Turn this source into the course structure.'}\n\n${ev.block}`, 8000);
  const ops: ChangeOp[] = [];
  const rid = () => Math.random().toString(36).slice(2, 10);
  let lessonCount = 0;
  for (const [mi, m] of (out.modules ?? []).entries()) {
    let ref = existing.find((e) => e.id === m.existingModuleId)?.id;
    if (!ref) { const t = 'mod_' + rid(); ops.push({ op: 'create_module', tempId: t, courseId: input.courseId, title: String(m.title), position: existing.length + mi }); ref = 'temp:' + t; }
    for (const [li, l] of (m.lessons ?? []).entries()) {
      ops.push({ op: 'create_lesson', tempId: 'les_' + rid(), courseId: input.courseId, moduleId: ref, title: String(l.title), description: l.summary ? String(l.summary) : undefined, type: 'article', position: li });
      lessonCount++;
    }
  }
  if (!ops.length) throw Object.assign(new Error('Kate could not map this source into modules.'), { status: 422, code: 'not_enough_evidence' });
  return finalize(deps, input, ev, { title: 'Course map from your source', summary: `${(out.modules ?? []).length} modules and ${lessonCount} lessons laid out in your source's order. Ask Kate to write each lesson next.`, courseId: input.courseId, ops }, out.gaps);
}
