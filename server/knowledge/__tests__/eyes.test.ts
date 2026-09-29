import { describe, expect, test } from 'vitest';
import { compareReads, visionReason, proposedText, type VisionRead } from '../eyes.js';
import { planPages } from '../vision.js';
import { cleanCaptions, detectSourceType } from '../extract.js';

const read = (text: string, extra: Partial<VisionRead> = {}): VisionRead => ({ text, visuals: [], uncertain: [], legible: true, ...extra });

describe('Kate eyes: which pages need vision', () => {
  test('image, scanned and chart pages are read; plain text pages are not', () => {
    expect(visionReason({ pageNumber: 1, textChars: 900, imageOps: 0, pathOps: 2 })).toBeNull();
    expect(visionReason({ pageNumber: 2, textChars: 900, imageOps: 1, pathOps: 0 })).toBe('image');
    expect(visionReason({ pageNumber: 3, textChars: 0, imageOps: 0, pathOps: 0 })).toBe('low_text');
    expect(visionReason({ pageNumber: 4, textChars: 500, imageOps: 0, pathOps: 40 })).toBe('graphics');
  });
  test('pages with a text layer only transcribe the visuals', () => {
    const plan = planPages([{ pageNumber: 1, textChars: 500, imageOps: 1, pathOps: 0 }, { pageNumber: 2, textChars: 0, imageOps: 1, pathOps: 0 }]);
    expect(plan.map((p) => p.mode)).toEqual(['visuals_only', 'full']);
  });
});

describe('Kate eyes: comparing the two readers', () => {
  test('identical readings agree', () => {
    expect(compareReads(read('Letter values A 1 M 4'), read('Letter values A 1 M 4')).agreed).toBe(true);
  });
  test('any number mismatch forces a human check', () => {
    const c = compareReads(read('A 1 M 4 V 6'), read('A 1 M 4 V 8'));
    expect(c.agreed).toBe(false);
    expect(c.differences).toEqual(expect.arrayContaining(['6', '8']));
  });
  test('uncertainty or illegibility is never auto-agreed', () => {
    expect(compareReads(read('A 1', { uncertain: ['1'] }), read('A 1')).agreed).toBe(false);
    expect(compareReads(read('A 1', { legible: false }), read('A 1')).agreed).toBe(false);
  });
  test('repeating words already in the PDF text layer is not a disagreement', () => {
    const page = 'Figure 1 shows the values used in Module 1.';
    const a = read('Figure 1 shows the values used in Module 1. Letter Values A 1 M 4');
    const b = read('Letter Values A 1 M 4');
    expect(compareReads(a, b).agreed).toBe(false);
    expect(compareReads(a, b, page).agreed).toBe(true);
  });
  test('proposed text includes visual notes', () => {
    expect(proposedText(read('T', { visuals: [{ kind: 'chart', description: 'bars' }] }))).toContain('- chart: bars');
  });
});

describe('uploads', () => {
  test('images and captions are recognised', () => {
    expect(detectSourceType('a.PNG')).toBe('image');
    expect(detectSourceType('talk.vtt')).toBe('transcript');
    expect(detectSourceType('talk.srt')).toBe('transcript');
  });
  test('captions are cleaned with time markers', () => {
    const t = cleanCaptions('WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nHello class\n\n2\n00:00:03.000 --> 00:00:05.000\nHello class\n\n3\n00:01:10.000 --> 00:01:12.000\n<c>Next topic</c>');
    expect(t).toBe('[00:01] Hello class\n[01:10] Next topic');
  });
});
