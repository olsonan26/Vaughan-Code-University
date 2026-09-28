/**
 * Kate "eyes": finds the visual pages of a PDF, renders them to PNG and has two independent
 * vision models transcribe them. Output is a PROPOSAL only: nothing read here becomes knowledge
 * until an instructor verifies it (see source_page_reads.status = 'verified').
 */
import type { ORContentPart, ORRequest, ORResponse } from '../ai/providers/openrouter.js';
import { KATE_MODELS, parseJsonLoose } from '../ai/providers/openrouter.js';

/** pdf.js 5 uses ArrayBuffer.transferToFixedLength (Node 21+). Polyfill for Node 20 runtimes. */
function ensurePdfJsPolyfills() {
  const proto = ArrayBuffer.prototype as any;
  if (typeof proto.transferToFixedLength !== 'function') {
    Object.defineProperty(proto, 'transferToFixedLength', {
      configurable: true, writable: true,
      value: function (this: ArrayBuffer, len?: number) { const n = len ?? this.byteLength; const out = new ArrayBuffer(n); new Uint8Array(out).set(new Uint8Array(this, 0, Math.min(n, this.byteLength))); return out; },
    });
  }
  if (typeof proto.transfer !== 'function') {
    Object.defineProperty(proto, 'transfer', { configurable: true, writable: true, value: proto.transferToFixedLength });
  }
}

export type VisionReason = 'image' | 'low_text' | 'graphics' | 'image_file';
export interface PageSignal { pageNumber: number; textChars: number; imageOps: number; pathOps: number }
export interface VisionRead { text: string; visuals: { kind: string; description: string }[]; uncertain: string[]; legible: boolean }
export interface VisionComparison { agreement: number; differences: string[]; agreed: boolean }

/** Pages with (almost) no selectable text are scanned images even when no image op is found. */
export const LOW_TEXT_CHARS = 30;
/** Vector drawings (charts, tables, diagrams) usually need many path operations. */
export const GRAPHICS_PATH_OPS = 15;
/** Hard cap so one huge scanned book cannot run away with cost. */
export const MAX_VISION_PAGES = 300;
/** Agreement needed (and all numbers identical) before a page is marked "both readers agree". */
export const AGREEMENT_THRESHOLD = 0.9;
/** Rendered page width in pixels: sharp enough for small chart labels, small enough to stay cheap. */
export const RENDER_WIDTH_PX = 1600;

export function visionReason(s: PageSignal): VisionReason | null {
  if (s.imageOps > 0) return 'image';
  if (s.textChars < LOW_TEXT_CHARS) return 'low_text';
  if (s.pathOps >= GRAPHICS_PATH_OPS) return 'graphics';
  return null;
}

/** Inspect every page's drawing operations (cheap, no rendering). */
export async function scanPdfPages(bytes: Uint8Array, textByPage: string[]): Promise<PageSignal[]> {
  ensurePdfJsPolyfills();
  const { getDocumentProxy, getResolvedPDFJS } = await import('unpdf');
  const { OPS } = await getResolvedPDFJS();
  const imageOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintImageXObjectRepeat, OPS.paintInlineImageXObjectGroup].filter((x) => x !== undefined));
  const doc = await getDocumentProxy(new Uint8Array(bytes));
  const out: PageSignal[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const ops = await page.getOperatorList();
    let img = 0, path = 0;
    for (const fn of ops.fnArray) { if (imageOps.has(fn)) img++; else if (fn === OPS.constructPath) path++; }
    out.push({ pageNumber: n, textChars: (textByPage[n - 1] ?? '').trim().length, imageOps: img, pathOps: path });
    page.cleanup();
  }
  await (doc as any).destroy?.();
  return out;
}

/** Render one PDF page to PNG bytes (server side, via @napi-rs/canvas). */
export async function renderPdfPage(bytes: Uint8Array, pageNumber: number, widthPx = RENDER_WIDTH_PX): Promise<Uint8Array> {
  ensurePdfJsPolyfills();
  const { renderPageAsImage } = await import('unpdf');
  const png = await renderPageAsImage(new Uint8Array(bytes), pageNumber, { canvasImport: () => import('@napi-rs/canvas'), width: widthPx });
  return new Uint8Array(png);
}

export const VISION_PROMPT = `You are a meticulous transcriber for a course author. You will see ONE page image.
Transcribe EXACTLY what is visible. Do not explain, summarize, correct, translate or add anything.
Rules:
- "text": every piece of visible text in natural reading order, verbatim (keep spelling, numbers, symbols, capitalization).
  This includes ALL printed body text on the page, not only text inside pictures.
  Tables: write them as Markdown tables with every cell. Charts: in "text" write the title, axis labels and every label with its value (e.g. "M: 4").
  Handwriting: transcribe it; if a word is unreadable write [illegible].
- "visuals": one entry per chart/table/diagram/photo: {"kind":"chart|table|diagram|photo|other","description":"what it shows, using only what is visible, including exact values"}.
- "uncertain": list any characters, words or numbers you are not fully sure about (exactly as you read them).
- "legible": false if the page is mostly unreadable.
Return ONLY JSON: {"text":"...","visuals":[...],"uncertain":[...],"legible":true}`;

export type ReadMode = 'full' | 'visuals_only';
const VISUALS_ONLY_NOTE = `IMPORTANT: this page's normal printed text has already been captured exactly from the PDF.
Transcribe ONLY what is inside pictures, photos, scans, charts, tables, diagrams, stamps and handwriting.
Do NOT repeat the page's normal paragraphs or headings. If there is nothing like that, return {"text":"","visuals":[],"uncertain":[],"legible":true}.`;

export function imagePart(bytes: Uint8Array, mime = 'image/png'): ORContentPart {
  return { type: 'image_url', image_url: { url: `data:${mime};base64,${Buffer.from(bytes).toString('base64')}` } };
}

function coerceRead(raw: unknown): VisionRead {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    text: String(o.text ?? '').trim(),
    visuals: Array.isArray(o.visuals) ? o.visuals.map((v: any) => ({ kind: String(v?.kind ?? 'other'), description: String(v?.description ?? '') })) : [],
    uncertain: Array.isArray(o.uncertain) ? o.uncertain.map(String) : [],
    legible: o.legible !== false,
  };
}

export async function readWithModel(chat: (r: ORRequest) => Promise<ORResponse>, model: string, image: ORContentPart, reasoningOff: boolean, mode: ReadMode = 'full'): Promise<{ read: VisionRead; model: string }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await chat({
        model,
        messages: [{ role: 'system', content: mode === 'visuals_only' ? `${VISION_PROMPT}\n\n${VISUALS_ONLY_NOTE}` : VISION_PROMPT }, { role: 'user', content: [{ type: 'text', text: mode === 'visuals_only' ? 'Transcribe only the visual content of this page.' : 'Transcribe this page.' }, image] }],
        json: true, temperature: 0, maxTokens: 6000, ...(reasoningOff ? { reasoning: 'off' as const } : {}),
      } as ORRequest);
      const read = coerceRead(parseJsonLoose(res.text));
      if (mode === 'full' && !read.text && read.visuals.length === 0 && read.legible) throw new Error('empty reading');
      return { read, model: res.model || model };
    } catch (e) { lastErr = e; }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Both readers run in parallel and independently (neither sees the other's answer). */
export async function dualRead(chat: (r: ORRequest) => Promise<ORResponse>, image: ORContentPart, mode: ReadMode = 'full') {
  const [primary, check] = await Promise.allSettled([
    readWithModel(chat, KATE_MODELS.eyesPrimary, image, true, mode),
    readWithModel(chat, KATE_MODELS.eyesCheck, image, true, mode),
  ]);
  return { primary, check };
}

const tokens = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
const numbers = (s: string) => new Set((s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(',', '.')));
const everything = (r: VisionRead) => `${r.text}\n${r.visuals.map((v) => v.description).join('\n')}`;

/**
 * Fact-level comparison, insensitive to layout (tables vs lines, text vs visual notes):
 * - every number either reader saw must be seen by the other (numbers are where mistakes hurt most)
 * - word coverage: share of each reader's transcribed words found anywhere in the other's reading
 * "agreed" needs identical number sets, coverage >= threshold both ways, no uncertainty, both legible.
 */
export function compareReads(a: VisionRead, b: VisionRead, knownPageText = ''): VisionComparison {
  // Words already in the PDF's own text layer are exact; one reader repeating them is not a disagreement.
  // Numbers are never ignored: chart values must match between readers.
  const known = tokens(knownPageText);
  const drop = (set: Set<string>) => new Set([...set].filter((w) => /^\d/.test(w) || !known.has(w)));
  const ta = drop(tokens(a.text)), tb = drop(tokens(b.text)), aa = tokens(everything(a)), ab = tokens(everything(b));
  const cover = (words: Set<string>, pool: Set<string>) => (words.size === 0 ? 1 : [...words].filter((w) => pool.has(w)).length / words.size);
  const agreement = Math.min(cover(ta, ab), cover(tb, aa));
  const na = numbers(everything(a)), nb = numbers(everything(b));
  const numDiff = [...new Set([...na, ...nb])].filter((n) => !(na.has(n) && nb.has(n)));
  const wordDiff = [...ta].filter((w) => !ab.has(w) && !/^\d/.test(w)).concat([...tb].filter((w) => !aa.has(w) && !/^\d/.test(w)));
  const differences = [...numDiff, ...new Set(wordDiff)].slice(0, 40);
  const agreed = agreement >= AGREEMENT_THRESHOLD && numDiff.length === 0 && a.legible && b.legible && a.uncertain.length === 0 && b.uncertain.length === 0;
  return { agreement: Math.round(agreement * 1000) / 1000, differences, agreed };
}

/** Text proposed to the instructor (from the primary reader), visuals appended as notes. */
export function proposedText(r: VisionRead): string {
  const vis = r.visuals.filter((v) => v.description).map((v) => `- ${v.kind}: ${v.description}`).join('\n');
  return [r.text, vis ? `\nVisual notes:\n${vis}` : ''].join('').trim();
}
