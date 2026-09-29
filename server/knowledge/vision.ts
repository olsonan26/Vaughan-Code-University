/**
 * Vision steps of the source.process job (Kate's eyes).
 *   planVision   (called from extract): decides which pages need reading, creates source_page_reads rows
 *   visionStep   ('vision:N'): renders page N, runs both readers, stores the comparison
 *   verifiedReadings (called from chunk): ONLY instructor-verified readings become knowledge
 * Readings are cached per (source, page): reprocessing never pays to read a page twice.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StepHandlerContext } from '../jobs/registry.js';
import { kateDeps } from '../kate/runtime.js';
import type { ORRequest, ORResponse } from '../ai/providers/openrouter.js';
import { MAX_VISION_PAGES, compareReads, dualRead, imagePart, proposedText, renderPdfPage, scanPdfPages, visionReason, type VisionReason } from './eyes.js';

type Db = SupabaseClient;
export const KNOWLEDGE_BUCKET = 'knowledge-sources';
export const REVIEW_PENDING = ['pending', 'agreed', 'needs_review', 'error'] as const;

let chatOverride: ((r: ORRequest) => Promise<ORResponse>) | null = null;
/** Tests inject a fake vision model. */
export function setVisionChat(fn: ((r: ORRequest) => Promise<ORResponse>) | null) { chatOverride = fn; }

export interface VisionPlanPage { pageNumber: number; reason: VisionReason; mode: 'full' | 'visuals_only' }

/** Pure planning from page signals (unit-tested). */
export function planPages(signals: { pageNumber: number; textChars: number; imageOps: number; pathOps: number }[]): VisionPlanPage[] {
  return signals
    .map((s) => ({ s, reason: visionReason(s) }))
    .filter((x): x is { s: typeof x.s; reason: VisionReason } => x.reason !== null)
    .slice(0, MAX_VISION_PAGES)
    .map(({ s, reason }) => ({ pageNumber: s.pageNumber, reason, mode: s.textChars >= 30 ? 'visuals_only' : 'full' }));
}

/** Creates missing rows and returns the step keys that still need a (re)read. */
export async function planVision(db: Db, src: Record<string, any>, type: string, bytes: Uint8Array, pageTexts: string[]) {
  let plan: VisionPlanPage[] = [];
  if (type === 'image') plan = [{ pageNumber: 1, reason: 'image_file', mode: 'full' }];
  else if (type === 'pdf') plan = planPages(await scanPdfPages(bytes, pageTexts));
  if (!plan.length) return { plan, toRead: [] as VisionPlanPage[] };

  const { data: existing, error } = await db.from('source_page_reads').select('page_number, status').eq('source_id', src.id);
  if (error) throw new Error(`Could not load page readings: ${error.message}`);
  const have = new Map((existing ?? []).map((r: any) => [r.page_number, r.status]));
  const fresh = plan.filter((p) => !have.has(p.pageNumber)).map((p) => ({ organization_id: src.organization_id, source_id: src.id, page_number: p.pageNumber, reason: p.reason, status: 'pending' }));
  if (fresh.length) {
    const ins = await db.from('source_page_reads').upsert(fresh, { onConflict: 'source_id,page_number', ignoreDuplicates: true });
    if (ins.error) throw new Error(`Could not create page readings: ${ins.error.message}`);
  }
  const toRead = plan.filter((p) => { const st = have.get(p.pageNumber); return st === undefined || st === 'pending' || st === 'error'; });
  return { plan, toRead };
}

export const visionStepKey = (n: number) => `vision:${n}`;

const isLastAttempt = (ctx: StepHandlerContext) => {
  const step: any = ctx.step;
  return (step.attemptCount ?? step.attempt_count ?? 1) >= (step.maxAttempts ?? step.max_attempts ?? 3);
};

/**
 * A page that cannot be read must never block or fail the whole source: retries happen as usual,
 * and on the final attempt the error is recorded on the page row (status 'error') for the instructor.
 */
export async function visionStep(ctx: StepHandlerContext, db: Db) {
  try {
    return await readPage(ctx, db);
  } catch (e) {
    if (!isLastAttempt(ctx)) throw e;
    const { pageNumber } = (ctx.input ?? {}) as { pageNumber: number };
    const msg = String((e as Error)?.message ?? e).slice(0, 400);
    await db.from('source_page_reads').update({ status: 'error', error: msg, updated_at: new Date().toISOString() }).eq('source_id', ctx.job.sourceId as string).eq('page_number', pageNumber);
    return { output: { pageNumber, status: 'error', error: msg } };
  }
}

async function readPage(ctx: StepHandlerContext, db: Db) {
  const sourceId = ctx.job.sourceId as string;
  const { pageNumber, mode } = (ctx.input ?? {}) as { pageNumber: number; mode: 'full' | 'visuals_only' };
  const { data: src, error } = await db.from('knowledge_sources').select('*').eq('id', sourceId).single();
  if (error || !src) throw new Error(`Source ${sourceId} not found`);
  const s = src as Record<string, any>;

  const file = await db.storage.from(KNOWLEDGE_BUCKET).download(s.file_path);
  if (file.error || !file.data) throw new Error(`The uploaded file could not be read: ${file.error?.message ?? 'missing'}`);
  const bytes = new Uint8Array(await file.data.arrayBuffer());
  const isPdf = (s.mime_type ?? '').includes('pdf') || /\.pdf$/i.test(s.original_filename ?? '');
  const png = isPdf ? await renderPdfPage(bytes, pageNumber) : bytes;
  const mime = isPdf ? 'image/png' : (s.mime_type || 'image/png');

  const imagePath = `${s.organization_id}/${s.id}/pages/p${String(pageNumber).padStart(4, '0')}.${isPdf ? 'png' : (mime.split('/')[1] || 'png')}`;
  if (isPdf) {
    const up = await db.storage.from(KNOWLEDGE_BUCKET).upload(imagePath, png, { contentType: 'image/png', upsert: true });
    if (up.error) throw new Error(`Could not store the page image: ${up.error.message}`);
  }

  const chat = chatOverride ?? kateDeps({ organizationId: s.organization_id, userId: s.created_by }, 'kate.eyes').chat;
  const { primary, check } = await dualRead(chat, imagePart(png, mime), mode ?? 'full');
  const base = { image_path: isPdf ? imagePath : s.file_path, updated_at: new Date().toISOString() };

  let row: Record<string, unknown>;
  if (primary.status === 'rejected' && check.status === 'rejected') {
    const msg = String((primary.reason as Error)?.message ?? primary.reason).slice(0, 300);
    throw new Error(`Both vision readers failed: ${msg}`);
  } else if (primary.status === 'fulfilled' && check.status === 'fulfilled') {
    const pageText = String(s.raw_content ?? '').split('\f')[pageNumber - 1] ?? '';
    const cmp = compareReads(primary.value.read, check.value.read, mode === 'visuals_only' ? pageText : '');
    row = { ...base, primary_model: primary.value.model, primary_result: primary.value.read, check_model: check.value.model, check_result: check.value.read,
      agreement: cmp.agreement, differences: cmp.differences, status: cmp.agreed ? 'agreed' : 'needs_review', final_text: proposedText(primary.value.read), error: null };
  } else {
    // Only one reader answered: never "agreed", the instructor must check it.
    const ok = (primary.status === 'fulfilled' ? primary.value : (check as PromiseFulfilledResult<any>).value);
    const failed = primary.status === 'rejected' ? primary : check;
    row = { ...base, primary_model: ok.model, primary_result: ok.read, check_model: null, check_result: null, agreement: null, differences: [],
      status: 'needs_review', final_text: proposedText(ok.read), error: `Second reader unavailable: ${String((failed as PromiseRejectedResult).reason?.message ?? '').slice(0, 200)}` };
  }
  const upd = await db.from('source_page_reads').update(row).eq('source_id', sourceId).eq('page_number', pageNumber);
  if (upd.error) throw new Error(`Could not save the page reading: ${upd.error.message}`);
  return { output: { pageNumber, status: row.status, agreement: row.agreement ?? null } };
}

/** Verified readings keyed by page, for chunking. Marks them as included. */
export async function verifiedReadings(db: Db, sourceId: string): Promise<Map<number, string>> {
  const { data, error } = await db.from('source_page_reads').select('page_number, final_text').eq('source_id', sourceId).eq('status', 'verified');
  if (error) throw new Error(`Could not load verified page readings: ${error.message}`);
  const map = new Map<number, string>();
  for (const r of data ?? []) if ((r as any).final_text?.trim()) map.set((r as any).page_number, String((r as any).final_text).trim());
  return map;
}

export async function markIncluded(db: Db, sourceId: string, pages: number[]) {
  await db.from('source_page_reads').update({ included_in_knowledge: false }).eq('source_id', sourceId);
  if (pages.length) await db.from('source_page_reads').update({ included_in_knowledge: true }).eq('source_id', sourceId).in('page_number', pages);
}

export async function pagesAwaitingReview(db: Db, sourceId: string): Promise<number> {
  const { count } = await db.from('source_page_reads').select('id', { count: 'exact', head: true }).eq('source_id', sourceId).in('status', REVIEW_PENDING as unknown as string[]);
  return count ?? 0;
}

/** Text added to a page's chunk material. The marker makes the provenance visible in citations. */
export const verifiedBlock = (page: number, text: string) => `\n\n[Image content on page ${page}, read by AI and verified by the instructor]\n${text}`;
