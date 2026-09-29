import type { GeneratorInput, ChangeSetDraft, ChangeOp } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { buildPlacementOps } from './common.js';
import { askWriter, citeMarkdown, finalize, gatherEvidence, provenanceFor, QUIZ_SHAPE, READING_SHAPE, refsFor, rules, toQuestions } from './engine.js';

/** Builds a whole lesson's content for one topic: reading + quiz (+ flashcards). Used by lesson and module generators. */
export async function writeLessonContent(input: GeneratorInput, deps: GeneratorDeps, ev: Awaited<ReturnType<typeof gatherEvidence>>, topic: string, withFlashcards: boolean) {
  const out = await askWriter(deps,
    `You are Kate's lesson writer for Vaughan Code University. Build one complete lesson on the requested topic from the evidence only.\n${rules(input)}\nReturn {"lessonTitle": string, "reading": {${READING_SHAPE}}, "quiz": {${QUIZ_SHAPE}}, ${withFlashcards ? '"flashcards": [{"front": string, "back": string, "sources": ["S1"]}], ' : ''}"gaps": [string]}. Quiz: 5-10 questions.`,
    `Lesson topic / instructor request: ${topic}\n\n${ev.block}`, 14000);
  const reading = citeMarkdown(ev, out.reading?.markdown ?? '');
  const questions = toQuestions(ev, out.quiz?.questions);
  const cards = withFlashcards ? (out.flashcards ?? []).filter((c: any) => c?.front && c?.back).map((c: any) => ({ front: String(c.front), back: String(c.back), sourceRefs: refsFor(ev, c.sources) })) : [];
  return { title: String(out.lessonTitle || topic), reading, questions, cards, gaps: out.gaps };
}

export function lessonItemOps(lessonRef: string, content: Awaited<ReturnType<typeof writeLessonContent>>, provenance: ReturnType<typeof provenanceFor>): ChangeOp[] {
  const ops: ChangeOp[] = [];
  const rid = () => Math.random().toString(36).slice(2, 10);
  if (content.reading.markdown) ops.push({ op: 'create_item', tempId: 'it_' + rid(), lessonId: lessonRef, kind: 'reading', slot: 'main', title: content.title, payload: { kind: 'reading', markdown: content.reading.markdown }, sourceRefs: content.reading.refs, provenance });
  if (content.questions.length) ops.push({ op: 'create_item', tempId: 'it_' + rid(), lessonId: lessonRef, kind: 'quiz', slot: 'section', title: `${content.title} quiz`, payload: { kind: 'quiz', passingScorePercent: 80, questions: content.questions }, sourceRefs: content.questions.flatMap((q) => q.sourceRefs ?? []), provenance });
  if (content.cards.length) ops.push({ op: 'create_item', tempId: 'it_' + rid(), lessonId: lessonRef, kind: 'flashcards', slot: 'resource', title: `${content.title} flashcards`, payload: { kind: 'flashcards', cards: content.cards }, sourceRefs: content.cards.flatMap((c: any) => c.sourceRefs), provenance });
  return ops;
}

export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  const ev = await gatherEvidence(input, deps, { query: input.instruction || input.placement.newLessonTitle, limit: 36 });
  const content = await writeLessonContent(input, deps, ev, input.instruction || input.placement.newLessonTitle || 'the main topic of the source', /flashcard/i.test(input.instruction ?? '') || true);
  const provenance = provenanceFor(input);
  const placement = { ...input.placement, newLessonTitle: input.placement.newLessonTitle || content.title };
  // placement ops for the first item, then append the rest into the same lesson
  const [first, ...rest] = lessonItemOps('__LESSON__', content, provenance);
  if (!first || first.op !== 'create_item') throw Object.assign(new Error('Kate could not find enough in your source to build this lesson.'), { status: 422, code: 'not_enough_evidence' });
  const built = buildPlacementOps(placement, first.kind, first.title, first.payload, first.sourceRefs, provenance, null);
  const ops = [...built.ops, ...rest.map((o) => (o.op === 'create_item' ? { ...o, lessonId: built.effectiveLessonId } : o))];
  const lock = input.lock ?? input.placement.lock;
  if (lock) ops.push(placement.lessonId === 'new'
    ? { op: 'set_lock', entityType: 'lesson', entityId: built.effectiveLessonId, rule: lock.rule, message: lock.message }
    : { op: 'set_lock', entityType: 'lesson_item', entityId: 'temp:' + built.itemTempId, rule: lock.rule, message: lock.message });
  return finalize(deps, input, ev, { title: `Lesson: ${content.title}`, summary: `Reading with ${content.reading.refs.length} citations, ${content.questions.length}-question quiz${content.cards.length ? `, ${content.cards.length} flashcards` : ''}.`, courseId: input.courseId, ops }, content.gaps);
}
