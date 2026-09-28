/**
 * Text extraction for Knowledge Vault uploads. Returns per-page text so citations can point at pages.
 * Supported: PDF (unpdf), DOCX (mammoth), TXT, MD, CSV, pasted text, caption files (VTT/SRT),
 * and images (text comes from Kate's eyes, see eyes.ts). Scanned PDFs return empty pages when
 * allowEmpty is set so the vision pass can read them.
 */
import { HttpError } from '../lib/errors.js';

export interface ExtractedPage {
  pageNumber: number | null;
  text: string;
}
export interface ExtractionResult {
  pages: ExtractedPage[];
  pageCount: number | null;
  charCount: number;
}

export const SOURCE_TYPES = ['pdf', 'docx', 'txt', 'md', 'csv', 'text', 'transcript', 'image'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export function detectSourceType(filename: string, mime?: string | null): SourceType | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (ext === 'md' || ext === 'markdown' || mime === 'text/markdown') return 'md';
  if (ext === 'csv' || mime === 'text/csv') return 'csv';
  if (ext === 'vtt' || ext === 'srt' || mime === 'text/vtt' || mime === 'application/x-subrip') return 'transcript';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext) || /^image\/(png|jpeg|webp)$/.test(mime ?? '')) return 'image';
  if (ext === 'txt' || mime === 'text/plain') return 'txt';
  return null;
}

const normalize = (t: string) =>
  t.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();

/**
 * Turns WebVTT/SRT captions into readable text. Keeps a [mm:ss] marker roughly every minute so
 * citations can point at a moment in the video; drops cue numbers, styling tags and repeats
 * (auto-captions often repeat the previous line).
 */
export function cleanCaptions(raw: string): string {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let lastMarker = -60, last = '';
  const toSec = (t: string) => { const p = t.replace(',', '.').split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
  for (const line of lines) {
    const l = line.trim();
    if (!l || l === 'WEBVTT' || /^(NOTE|STYLE|REGION|Kind:|Language:)/.test(l) || /^\d+$/.test(l)) continue;
    const cue = l.match(/^(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->/);
    if (cue) {
      const sec = toSec(l.split('-->')[0].trim());
      if (sec - lastMarker >= 60) { const m = Math.floor(sec / 60), ss = Math.floor(sec % 60); out.push(`\n[${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}]`); lastMarker = sec; }
      continue;
    }
    const text = l.replace(/<[^>]+>/g, '').replace(/\{[^}]+\}/g, '').trim();
    if (text && text !== last) { out.push(text); last = text; }
  }
  return out.join(' ').replace(/ \n\[/g, '\n[').trim();
}

export async function extractText(bytes: Uint8Array, type: SourceType, opts: { allowEmpty?: boolean } = {}): Promise<ExtractionResult> {
  let pages: ExtractedPage[];
  if (type === 'image') {
    return { pages: [{ pageNumber: 1, text: '' }], pageCount: 1, charCount: 0 };
  }
  if (type === 'transcript') {
    const text = cleanCaptions(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
    pages = [{ pageNumber: null, text: normalize(text) }];
  } else if (type === 'pdf') {
    const { extractText: pdfText, getDocumentProxy } = await import('unpdf');
    let doc;
    try {
      doc = await getDocumentProxy(new Uint8Array(bytes));
    } catch (e) {
      throw new HttpError(422, 'extraction_failed', `This PDF could not be opened (${(e as Error).message}). It may be encrypted or corrupted.`);
    }
    const { text } = await pdfText(doc, { mergePages: false });
    const arr = Array.isArray(text) ? text : [text];
    pages = arr.map((t, i) => ({ pageNumber: i + 1, text: normalize(t) }));
    if (!opts.allowEmpty && pages.every((p) => p.text.length === 0)) {
      throw new HttpError(422, 'no_text', 'No selectable text was found in this PDF. It is probably a scanned image.');
    }
  } else if (type === 'docx') {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    pages = [{ pageNumber: null, text: normalize(value) }];
  } else {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    pages = [{ pageNumber: null, text: normalize(text) }];
  }
  const charCount = pages.reduce((n, p) => n + p.text.length, 0);
  if (charCount === 0 && !(opts.allowEmpty && type === 'pdf')) throw new HttpError(422, 'no_text', 'The file contains no readable text.');
  return { pages, pageCount: type === 'pdf' ? pages.length : null, charCount };
}

export async function sha256Hex(bytes: Uint8Array | string): Promise<string> {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
