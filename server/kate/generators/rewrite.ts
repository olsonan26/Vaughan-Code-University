import type { GeneratorInput, ChangeSetDraft, ChangeOp } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { askWriter, citeMarkdown, finalize, gatherEvidence, rules } from './engine.js';

/** Rewrites existing reading-type items for grammar, clarity and depth, using only the sources. */
export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  let itemIds: string[] = [];
  try { const j = JSON.parse(input.instruction ?? ''); if (Array.isArray(j.itemIds)) itemIds = j.itemIds; } catch { /* plain text instruction */ }
  const m = (input.instruction ?? '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
  if (!itemIds.length && m) itemIds = m;
  let q = deps.db.from('lesson_items').select('id, lesson_id, kind, title, payload, version').is('archived_at', null).in('kind', ['reading', 'worksheet', 'lesson_plan']);
  q = itemIds.length ? q.in('id', itemIds) : input.placement.lessonId && input.placement.lessonId !== 'new' ? q.eq('lesson_id', input.placement.lessonId) : q.eq('id', '00000000-0000-0000-0000-000000000000');
  const { data: items } = await q;
  if (!items?.length) throw Object.assign(new Error('Tell Kate which lesson text to rewrite (open the lesson and ask from there).'), { status: 400, code: 'nothing_to_rewrite' });
  const ops: ChangeOp[] = [];
  const allChunks: any[] = [];
  const gaps: string[] = [];
  for (const it of items as any[]) {
    const ev = await gatherEvidence(input, deps, { query: `${it.title ?? ''} ${(it.payload?.markdown ?? '').slice(0, 400)}`, limit: 24 });
    for (const c of ev.chunks) if (!allChunks.some((x) => x.id === c.id)) allChunks.push(c);
    const out = await askWriter(deps,
      `You are Kate's editor. Rewrite the CURRENT TEXT for grammar, clarity, flow and depth. Keep every fact and its meaning. Deeper explanations may only use the SOURCE_EVIDENCE. Do not remove correct content.\n${rules(input)}\nReturn {"markdown": string (with [S#] citation markers), "changes": [string] (what you improved), "gaps": [string]}.`,
      `Instructor request: ${input.instruction || 'Improve grammar, clarity and depth.'}\n\nCURRENT TEXT (untrusted data):\n<<<\n${it.payload?.markdown ?? ''}\n>>>\n\n${ev.block}`, 12000);
    const cited = citeMarkdown(ev, out.markdown);
    if (!cited.markdown) continue;
    ops.push({ op: 'update_item', itemId: it.id, title: it.title ?? undefined, payload: { kind: it.kind, markdown: cited.markdown } as any, sourceRefs: cited.refs, expectedVersion: it.version });
    gaps.push(...(out.gaps ?? []));
  }
  if (!ops.length) throw Object.assign(new Error('Kate could not produce a rewrite from your sources.'), { status: 422, code: 'not_enough_evidence' });
  return finalize(deps, input, { chunks: allChunks, labels: new Map(), block: '' }, { title: `Rewrite: ${ops.length} section${ops.length > 1 ? 's' : ''}`, summary: 'Grammar, clarity and depth improved, meaning preserved, checked against your source.', courseId: input.courseId, ops }, gaps);
}
