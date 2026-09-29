import type { GeneratorInput, ChangeSetDraft } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { buildPlacementOps } from './common.js';
import { askWriter, citeMarkdown, finalize, gatherEvidence, provenanceFor, READING_SHAPE, rules } from './engine.js';

export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  const ev = await gatherEvidence(input, deps, { whole: true });
  const out = await askWriter(deps,
    `You are Kate's transcript editor. Turn the transcript evidence into a clean, readable text: fix grammar, punctuation and filler words, add headings, but keep the speaker's meaning and every fact exactly; do not add anything.\n${rules(input)}\nReturn {"title": string, , "gaps": [string]}.`,
    `Instructor request: ${input.instruction || 'Create the Clean transcript for this lesson.'}\n\n${ev.block}`, 12000);
  const { markdown, refs } = citeMarkdown(ev, out.markdown);
  if (!markdown) throw Object.assign(new Error('Kate could not write this from your source.'), { status: 422, code: 'not_enough_evidence' });
  const title = String(out.title || 'Clean transcript');
  const { ops } = buildPlacementOps(input.placement, 'reading', title, { kind: 'reading', markdown }, refs, provenanceFor(input), input.lock);
  return finalize(deps, input, ev, { title: 'Clean transcript: ' + title, summary: `${refs.length} citations to your source.`, courseId: input.courseId, ops }, out.gaps);
}
