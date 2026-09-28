import type { GeneratorInput, ChangeSetDraft } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { buildPlacementOps } from './common.js';
import { askWriter, citeMarkdown, finalize, gatherEvidence, provenanceFor, READING_SHAPE, rules } from './engine.js';

export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  const ev = await gatherEvidence(input, deps, { query: input.instruction, limit: 30 });
  const out = await askWriter(deps,
    `You are Kate's worksheet writer. Write a practice worksheet (instructions, exercises, space prompts, and an answer key section at the end) using only examples and methods from the evidence.\n${rules(input)}\nReturn {"title": string, , "gaps": [string]}.`,
    `Instructor request: ${input.instruction || 'Create the Worksheet for this lesson.'}\n\n${ev.block}`, 12000);
  const { markdown, refs } = citeMarkdown(ev, out.markdown);
  if (!markdown) throw Object.assign(new Error('Kate could not write this from your source.'), { status: 422, code: 'not_enough_evidence' });
  const title = String(out.title || 'Worksheet');
  const { ops } = buildPlacementOps(input.placement, 'worksheet', title, { kind: 'worksheet', markdown }, refs, provenanceFor(input), input.lock);
  return finalize(deps, input, ev, { title: 'Worksheet: ' + title, summary: `${refs.length} citations to your source.`, courseId: input.courseId, ops }, out.gaps);
}
