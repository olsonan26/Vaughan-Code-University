/**
 * Paragraph-aware chunker with page + section tracking and overlap.
 * Keeps formulas/lines intact by splitting on paragraph boundaries first.
 */
import type { ExtractedPage } from './extract.js';

export interface TextChunk {
  chunkIndex: number;
  pageNumber: number | null;
  sectionTitle: string | null;
  content: string;
  tokenCount: number;
}

export const approxTokens = (text: string) => Math.ceil(text.length / 4);

const HEADING = /^(#{1,6}\s+.+|(?:chapter|section|module|lesson|part)\s+[\w.]+.*|\d+(?:\.\d+)*\s+[A-Z].{2,80}|[A-Z][A-Z0-9 ,:'&-]{3,80})$/i;

function isHeading(line: string) {
  const t = line.trim();
  if (t.length < 3 || t.length > 90) return false;
  if (/^#{1,6}\s/.test(t)) return true;
  if (/[.!?,;]$/.test(t)) return false;
  return HEADING.test(t) && (t === t.toUpperCase() || /^(#|\d|chapter|section|module|lesson|part)/i.test(t));
}

export function chunkPages(pages: ExtractedPage[], opts: { targetTokens?: number; overlapTokens?: number } = {}): TextChunk[] {
  const target = opts.targetTokens ?? 700;
  const overlap = opts.overlapTokens ?? 80;
  const chunks: TextChunk[] = [];
  let section: string | null = null;
  let buf: string[] = [];
  let bufPage: number | null = null;
  let bufSection: string | null = null;

  const flush = () => {
    const content = buf.join('\n\n').trim();
    if (!content) return;
    chunks.push({ chunkIndex: chunks.length, pageNumber: bufPage, sectionTitle: bufSection, content, tokenCount: approxTokens(content) });
    // overlap: carry the tail of the previous chunk
    const tail: string[] = [];
    let n = 0;
    for (let i = buf.length - 1; i >= 0 && n < overlap; i--) {
      tail.unshift(buf[i]);
      n += approxTokens(buf[i]);
    }
    buf = n <= overlap * 2 ? tail : [];
  };

  for (const page of pages) {
    const paras = page.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    for (const para of paras) {
      const firstLine = para.split('\n')[0];
      if (isHeading(firstLine)) section = firstLine.replace(/^#+\s*/, '').trim();
      // split oversized paragraphs by sentences
      const pieces = approxTokens(para) > target ? para.match(/[^.!?\n]+[.!?]?\s*|\n/g)?.reduce<string[]>((acc, s) => {
        const last = acc[acc.length - 1];
        if (last && approxTokens(last + s) <= target) acc[acc.length - 1] = last + s;
        else acc.push(s);
        return acc;
      }, []) ?? [para] : [para];
      for (const piece of pieces) {
        const size = buf.reduce((n, p) => n + approxTokens(p), 0);
        if (buf.length && (size + approxTokens(piece) > target || bufPage !== page.pageNumber)) flush();
        if (!buf.length || bufPage === null) { bufPage = page.pageNumber; bufSection = section; }
        if (buf.length === 0) { bufPage = page.pageNumber; bufSection = section; }
        buf.push(piece.trim());
      }
    }
  }
  // final flush without carrying overlap
  const content = buf.join('\n\n').trim();
  if (content && !(chunks.length && chunks[chunks.length - 1].content.endsWith(content))) {
    chunks.push({ chunkIndex: chunks.length, pageNumber: bufPage, sectionTitle: bufSection, content, tokenCount: approxTokens(content) });
  }
  return chunks;
}
