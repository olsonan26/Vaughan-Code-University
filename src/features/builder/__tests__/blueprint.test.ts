import { describe, expect, it } from 'vitest';
import { bp, type Blueprint } from '../api';

const L = (k: string, ids: string[]) => ({ key: k, title: k, focus: `${k} focus`, objectives: [k], keyTerms: [k], chunkIds: ids });
const make = (): Blueprint => ({ courseTitle: 'C', description: '', outcomes: [], gaps: [], uncovered: [], stats: { passages: 5, covered: 5, skipped: 0 },
  modules: [{ key: 'm1', title: 'M1', description: '', lessons: [L('a', ['1']), L('b', ['2', '3'])] }, { key: 'm2', title: 'M2', description: '', lessons: [L('c', ['4']), L('d', ['5'])] }] });
const keys = (b: Blueprint) => b.modules.map((m) => m.lessons.map((l) => l.key).join(''));

describe('outline editing', () => {
  it('moves lessons within and across modules', () => {
    expect(keys(bp.moveLesson(make(), 0, 0, 1))).toEqual(['ba', 'cd']);
    expect(keys(bp.moveLesson(make(), 0, 1, 1))).toEqual(['a', 'bcd']);
    expect(keys(bp.moveLesson(make(), 1, 0, -1))).toEqual(['abc', 'd']);
  });
  it('merges lessons without losing or duplicating passages', () => {
    const n = bp.mergeWithNext(make(), 0, 0);
    expect(keys(n)).toEqual(['a', 'cd']);
    expect(n.modules[0].lessons[0].chunkIds).toEqual(['1', '2', '3']);
    expect(bp.covered(n)).toBe(5);
  });
  it('splits and merges modules', () => {
    const s = bp.splitModuleAt(make(), 1, 1);
    expect(keys(s)).toEqual(['ab', 'c', 'd']);
    expect(keys(bp.mergeModuleWithNext(s, 1))).toEqual(['ab', 'cd']);
  });
  it('removing a lesson reduces coverage and drops empty modules', () => {
    let n = bp.removeLesson(make(), 1, 0); n = bp.removeLesson(n, 1, 0);
    expect(keys(n)).toEqual(['ab']);
    expect(bp.covered(n)).toBe(3);
    expect(bp.lessonCount(n)).toBe(2);
  });
  it('never mutates the original', () => { const o = make(); bp.mergeWithNext(o, 0, 0); expect(keys(o)).toEqual(['ab', 'cd']); });
});
