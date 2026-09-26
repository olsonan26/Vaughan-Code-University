import { describe, it, expect } from 'vitest';
import { chunkPages } from '../chunk.js';
import { detectSourceType, extractText, sha256Hex } from '../extract.js';

describe('knowledge extraction + chunking', () => {
  it('detects types', () => {
    expect(detectSourceType('a.PDF')).toBe('pdf');
    expect(detectSourceType('notes.md')).toBe('md');
    expect(detectSourceType('x.docx')).toBe('docx');
    expect(detectSourceType('evil.exe')).toBeNull();
  });
  it('extracts plain text and hashes', async () => {
    const r = await extractText(new TextEncoder().encode('Hello\r\nWorld'), 'txt');
    expect(r.pages[0].text).toBe('Hello\nWorld');
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('rejects empty text', async () => {
    await expect(extractText(new Uint8Array(), 'txt')).rejects.toMatchObject({ code: 'no_text' });
  });
  it('tracks pages, sections and size', () => {
    const para = 'The compound number 41 reduces to 5 because 4 + 1 = 5. '.repeat(20);
    const chunks = chunkPages(
      [
        { pageNumber: 1, text: `# Compound Numbers\n\n${para}\n\n${para}` },
        { pageNumber: 2, text: `NUMBER REDUCTION\n\n${para}` },
      ],
      { targetTokens: 400, overlapTokens: 40 },
    );
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].sectionTitle).toBe('Compound Numbers');
    const p2 = chunks.find((c) => c.pageNumber === 2)!;
    expect(p2.sectionTitle).toBe('NUMBER REDUCTION');
    expect(chunks.every((c) => c.tokenCount <= 400 + 60)).toBe(true);
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });
});
