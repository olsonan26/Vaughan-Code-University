import type { GeneratorInput, ChangeSetDraft, ChangeOp } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { askWriter, finalize, gatherEvidence, provenanceFor, rules } from './engine.js';
import { lessonItemOps, writeLessonContent } from './lesson.js';

/** A whole module: outline from the full source, then each lesson written from its own evidence. */
export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  const whole = await gatherEvidence(input, deps, { whole: true, maxTokens: 100_000 });
  const outline = await askWriter(deps,
    `You are Kate's course architect. Split the evidence into a module of 2-8 lessons that follow the source's own order and structure.\n${rules(input)}\nReturn {"moduleTitle": string, "lessons": [{"title": string, "focus": string (what this lesson covers, using the source's words), "sources": ["S1"]}], "gaps": [string]}.`,
    `Instructor request: ${input.instruction || 'Build a module from this source.'}\n\n${whole.block}`, 4000);
  const lessons = (outline.lessons ?? []).slice(0, 8);
  if (!lessons.length) throw Object.assign(new Error('Kate could not outline a module from this source.'), { status: 422, code: 'not_enough_evidence' });
  const provenance = provenanceFor(input);
  const rid = () => Math.random().toString(36).slice(2, 10);
  const ops: ChangeOp[] = [];
  let moduleRef = input.placement.moduleId;
  if (moduleRef === 'new') { const t = 'mod_' + rid(); ops.push({ op: 'create_module', tempId: t, courseId: input.courseId, title: input.placement.newModuleTitle || String(outline.moduleTitle || 'New module') }); moduleRef = 'temp:' + t; }
  const gaps: string[] = [...(outline.gaps ?? [])];
  const allChunks = [...whole.chunks];
  let firstLessonRef = '';
  for (const [i, l] of lessons.entries()) {
    const ev = await gatherEvidence(input, deps, { query: `${l.title}. ${l.focus ?? ''}`, limit: 24 });
    for (const c of ev.chunks) if (!allChunks.some((x) => x.id === c.id)) allChunks.push(c);
    const content = await writeLessonContent(input, deps, ev, `${l.title}: ${l.focus ?? ''}`, false);
    const t = 'les_' + rid();
    ops.push({ op: 'create_lesson', tempId: t, courseId: input.courseId, moduleId: moduleRef, title: content.title || l.title, type: 'article', position: i });
    if (!firstLessonRef) firstLessonRef = 'temp:' + t;
    ops.push(...lessonItemOps('temp:' + t, content, provenance));
    if (i > 0) ops.push({ op: 'set_lock', entityType: 'lesson', entityId: 'temp:' + t, rule: { type: 'after_previous' }, message: 'Finish the previous lesson first.' });
    gaps.push(...(content.gaps ?? []));
  }
  const lock = input.lock ?? input.placement.lock;
  if (lock && moduleRef.startsWith('temp:')) ops.push({ op: 'set_lock', entityType: 'module', entityId: moduleRef, rule: lock.rule, message: lock.message });
  return finalize(deps, input, { ...whole, chunks: allChunks }, { title: `Module: ${outline.moduleTitle ?? 'New module'}`, summary: `${lessons.length} lessons, each with a cited reading and quiz. Lessons unlock in order.`, courseId: input.courseId, ops }, gaps);
}
