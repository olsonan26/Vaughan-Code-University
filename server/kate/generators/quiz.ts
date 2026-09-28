import type { GeneratorInput, ChangeSetDraft } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { buildPlacementOps } from './common.js';
import { askWriter, finalize, gatherEvidence, provenanceFor, QUIZ_SHAPE, rules, toQuestions } from './engine.js';

export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  const ev = await gatherEvidence(input, deps, { query: input.instruction, limit: 30 });
  const out = await askWriter(deps,
    `You are Kate's assessment writer for Vaughan Code University. Write a clear, fair quiz that tests understanding of the SOURCE_EVIDENCE only.\n${rules(input)}\nReturn {"title": string, ${QUIZ_SHAPE}, "passingScorePercent": number, "gaps": [string]}. 5-15 questions depending on how much the evidence covers. Distractors must be plausible but clearly wrong per the evidence. Mix single, multiple and true_false.`,
    `Instructor request: ${input.instruction || 'Make a quiz for this lesson.'}\nPlacement: ${input.placement.newLessonTitle ?? ''}\n\n${ev.block}`);
  const questions = toQuestions(ev, out.questions);
  if (!questions.length) throw Object.assign(new Error('Kate could not find enough in your source to write quiz questions.'), { status: 422, code: 'not_enough_evidence' });
  const title = String(out.title || 'Quiz');
  const refs = questions.flatMap((q) => q.sourceRefs ?? []);
  const { ops } = buildPlacementOps(input.placement, 'quiz', title, { kind: 'quiz', passingScorePercent: Number(out.passingScorePercent) || 80, questions }, refs, provenanceFor(input), input.lock);
  return finalize(deps, input, ev, { title: `Quiz: ${title}`, summary: `${questions.length} questions, every answer cited from your source.`, courseId: input.courseId, ops }, out.gaps);
}
