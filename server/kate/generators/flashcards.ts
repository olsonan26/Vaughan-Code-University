import type { GeneratorInput, ChangeSetDraft } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { buildPlacementOps } from './common.js';
import { askWriter, finalize, gatherEvidence, provenanceFor, refsFor, rules } from './engine.js';

export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  const ev = await gatherEvidence(input, deps, { query: input.instruction, limit: 30 });
  const out = await askWriter(deps,
    `You are Kate's flashcard writer. Make concise study flashcards (term/question on the front, precise answer on the back) from the evidence only.\n${rules(input)}\nReturn {"title": string, "cards": [{"front": string, "back": string, "sources": ["S1"]}], "gaps": [string]}. 8-30 cards.`,
    `Instructor request: ${input.instruction || 'Make flashcards for this lesson.'}\n\n${ev.block}`);
  const cards = (out.cards ?? []).filter((c: any) => c?.front && c?.back).map((c: any) => ({ front: String(c.front), back: String(c.back), sourceRefs: refsFor(ev, c.sources, c.back) }));
  if (!cards.length) throw Object.assign(new Error('Kate could not find enough in your source for flashcards.'), { status: 422, code: 'not_enough_evidence' });
  const title = String(out.title || 'Flashcards');
  const { ops } = buildPlacementOps(input.placement, 'flashcards', title, { kind: 'flashcards', cards }, cards.flatMap((c: any) => c.sourceRefs), provenanceFor(input), input.lock);
  return finalize(deps, input, ev, { title: `Flashcards: ${title}`, summary: `${cards.length} cards from your source.`, courseId: input.courseId, ops }, out.gaps);
}
