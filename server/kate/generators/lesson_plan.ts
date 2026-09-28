import type { GeneratorInput, ChangeSetDraft } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { buildPlacementOps } from './common.js';
import { askWriter, citeMarkdown, finalize, gatherEvidence, provenanceFor, READING_SHAPE, rules } from './engine.js';

export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  const ev = await gatherEvidence(input, deps, { query: input.instruction, limit: 30 });
  const out = await askWriter(deps,
    `You are Kate's lesson planner. Write an instructor lesson plan: objectives, timing, sequence of activities, key points to emphasise, checks for understanding, all grounded in the evidence.\n${rules(input)}\nReturn {"title": string, , "gaps": [string]}.`,
    `Instructor request: ${input.instruction || 'Create the Lesson plan for this lesson.'}\n\n${ev.block}`, 12000);
  const { markdown, refs } = citeMarkdown(ev, out.markdown);
  if (!markdown) throw Object.assign(new Error('Kate could not write this from your source.'), { status: 422, code: 'not_enough_evidence' });
  const title = String(out.title || 'Lesson plan');
  const { ops } = buildPlacementOps(input.placement, 'lesson_plan', title, { kind: 'lesson_plan', markdown }, refs, provenanceFor(input), input.lock);
  return finalize(deps, input, ev, { title: 'Lesson plan: ' + title, summary: `${refs.length} citations to your source.`, courseId: input.courseId, ops }, out.gaps);
}
