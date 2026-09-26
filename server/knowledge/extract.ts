/**
 * Text extraction for Knowledge Vault uploads. Returns per-page text so citations can point at pages.
 * Supported: PDF (unpdf), DOCX (mammoth), TXT, MD, CSV, pasted text.
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

export const SOURCE_TYPES = ['pdf', 'docx', 'txt', 'md', 'csv', 'text', 'transcript'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export function detectSourceType(filename: string, mime?: string | null): SourceType | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (ext === 'md' || ext === 'markdown' || mime === 'text/markdown') return 'md';
  if (ext === 'csv' || mime === 'text/csv') return 'csv';
  if (ext === 'txt' || ext === 'vtt' || ext === 'srt' || mime === 'text/plain') return 'txt';
  return null;
}

const normalize = (t: string) =>
  t.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();

export async function extractText(bytes: Uint8Array, type: SourceType): Promise<ExtractionResult> {
  let pages: ExtractedPage[];
  if (type === 'pdf') {
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
    if (pages.every((p) => p.text.length === 0)) {
      throw new HttpError(422, 'no_text', 'No selectable text was found in this PDF. It is probably a scanned image; OCR is not supported yet.');
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
  if (charCount === 0) throw new HttpError(422, 'no_text', 'The file contains no readable text.');
  return { pages, pageCount: type === 'pdf' ? pages.length : null, charCount };
}

export async function sha256Hex(bytes: Uint8Array | string): Promise<string> {
  const data = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
