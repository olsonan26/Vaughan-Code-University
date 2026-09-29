import { describe, expect, it } from 'vitest';
import { evidenceFrom, groupSegments, labelsToIds, lessonOps, repairCoverage, windowChunks, writeSteps } from '../courseBuild.js';

const ch = (id: string, words = 10, page = 1) => ({ id, sourceTitle: 'Book', pageNumber: page, sectionTitle: null, authority: 3, content: 'word '.repeat(words) });
const seg = (title: string, chunkIds: string[]) => ({ title, focus: `${title} focus`, objectives: [`know ${title}`], keyTerms: [title], chunkIds });

describe('course builder: reading the whole source', () => {
  it('packs chunks into windows without splitting any', () => {
    const chunks = Array.from({ length: 10 }, (_, i) => ch(`c${i}`, 400));
    const w = windowChunks(chunks, 1200);
    expect(w.flat().map((c) => c.id)).toEqual(chunks.map((c) => c.id));
    expect(w.length).toBeGreaterThan(3);
  });
  it('resolves label ranges and lists to chunk ids in order', () => {
    const ev = evidenceFrom(['a', 'b', 'c', 'd'].map((id) => ch(id)) as any);
    expect(labelsToIds(ev, { from: 'S2', to: 'S4' })).toEqual(['b', 'c', 'd']);
    expect(labelsToIds(ev, { labels: ['S1', 'S3', 'S9'] })).toEqual(['a', 'c']);
    expect(labelsToIds(ev, { from: 'S3' })).toEqual(['c']);
  });
  it('every passage ends up in exactly one lesson unless skipped', () => {
    const order = ['a', 'b', 'c', 'd', 'e', 'f'];
    const segs = repairCoverage(order, [seg('one', ['b', 'c']), seg('two', ['c', 'e'])], new Set(['a']));
    expect(segs.flatMap((s) => s.chunkIds).sort()).toEqual(['b', 'c', 'd', 'e', 'f']);
    expect(segs[0].chunkIds).toEqual(['b', 'c', 'd']);
    expect(segs[1].chunkIds).toEqual(['e', 'f']);
  });
});

describe('course builder: module structure', () => {
  const segs = () => [seg('s0', ['a']), seg('s1', ['b']), seg('s2', ['c']), seg('s3', ['d'])];
  it('keeps order, merges lessons, and never drops a segment the model forgot', () => {
    const mods = groupSegments(segs(), [{ title: 'M1', lessons: [{ title: 'L1', segments: [0, 1] }] }, { title: 'M2', lessons: [{ title: 'L2', segments: [3] }] }], () => 'p. 1', 'Course');
    expect(mods.map((m) => m.title)).toEqual(['M1', 'M2']);
    expect(mods.flatMap((m) => m.lessons.flatMap((l) => l.chunkIds))).toEqual(['a', 'b', 'c', 'd']);
    expect(mods[0].lessons[0].title).toBe('L1');
    expect(new Set(mods.flatMap((m) => m.lessons.map((l) => l.key))).size).toBe(2);
  });
  it('ignores reordering and duplicates, appends leftovers', () => {
    const mods = groupSegments(segs(), [{ title: 'M', lessons: [{ title: 'x', segments: [2] }, { title: 'y', segments: [0] }, { title: 'z', segments: [2] }] }], () => undefined, 'Course');
    expect(mods.flatMap((m) => m.lessons.flatMap((l) => l.chunkIds))).toEqual(['a', 'b', 'c', 'd']);
  });
  it('builds a module from nothing when the model returns garbage', () => {
    const mods = groupSegments(segs(), null as any, () => undefined, 'Fallback');
    expect(mods[0].title).toBe('Fallback');
    expect(mods[0].lessons).toHaveLength(4);
  });
});

describe('course builder: writing plan and assembly', () => {
  it('writes, quizzes and fact-checks every lesson before assembling', () => {
    const steps = writeSteps('b1', ['l1', 'l2']);
    expect(steps.map((s) => s.key)).toEqual(['write:l1', 'practice:l1', 'check:l1', 'write:l2', 'practice:l2', 'check:l2', 'assemble']);
    expect(steps.find((s) => s.key === 'assemble')!.dependsOn).toEqual(['check:l1', 'check:l2']);
    expect(steps.find((s) => s.key === 'practice:l2')!.dependsOn).toEqual(['write:l2']);
  });
  it('creates reading, quiz, flashcards and worksheet items, all source-only', () => {
    const ops = lessonOps('temp:l', 'T', { markdown: '# hi', refs: [] }, { questions: [{ id: 'q', prompt: 'p', type: 'single', options: [], correctOptionIds: [], sourceRefs: [] }], cards: [{ front: 'f', back: 'b', sourceRefs: [] }], worksheet: { markdown: 'w', refs: [] } });
    expect(ops.map((o: any) => o.kind)).toEqual(['reading', 'quiz', 'flashcards', 'worksheet']);
    expect(ops.every((o: any) => o.provenance === 'ai_source_only' && o.lessonId === 'temp:l')).toBe(true);
  });
});
