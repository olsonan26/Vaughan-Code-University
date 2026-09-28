/**
 * source.process job: extract -> chunk -> (embed + analyze:N batches) -> finalize.
 * Every step is idempotent (re-running replaces its own rows), so retries are safe.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerStepHandler, type StepHandlerContext } from '../jobs/registry.js';
import { getServiceClient } from '../lib/supabase.js';
import { createGateway, type Gateway } from '../ai/gateway.js';
import { createSupabaseAiLogger } from '../ai/logger.js';
import { buildKnowledgeAnalystRequest, sanitizeConceptRefs, type KnowledgeAnalystOutput } from '../ai/skills/knowledge-analyst/index.js';
import type { EvidenceChunk, LockedKnowledge } from '../ai/skills/types.js';
import { getEmbeddingProvider } from '../ai/embeddings/index.js';
import { detectSourceType, extractText, type SourceType } from './extract.js';
import { chunkPages } from './chunk.js';
import { cleanCaptions } from './extract.js';
import { markIncluded, pagesAwaitingReview, planVision, verifiedBlock, verifiedReadings, visionStep, visionStepKey } from './vision.js';

export const PAGE_BREAK = '\f';
export const ANALYZE_BATCH_SIZE = 6;
export const KNOWLEDGE_BUCKET = 'knowledge-sources';

let gatewayOverride: Gateway | null = null;
/** Tests inject a gateway backed by a mock provider. */
export function setKnowledgeGateway(g: Gateway | null) {
  gatewayOverride = g;
}
function gateway(db: SupabaseClient): Gateway {
  return gatewayOverride ?? createGateway({ logger: createSupabaseAiLogger(db) });
}

type Db = SupabaseClient;

async function setState(db: Db, sourceId: string, state: string, extra: Record<string, unknown> = {}) {
  const { error } = await db.from('knowledge_sources').update({ processing_state: state, updated_at: new Date().toISOString(), ...extra }).eq('id', sourceId);
  if (error) throw new Error(`Could not update source state: ${error.message}`);
}

async function loadSource(db: Db, sourceId: string) {
  const { data, error } = await db.from('knowledge_sources').select('*').eq('id', sourceId).single();
  if (error || !data) throw new Error(`Source ${sourceId} not found`);
  return data as Record<string, any>;
}

/** Marks the source failed when a step exhausts its attempts, then rethrows for the worker. */
async function guard<T>(ctx: StepHandlerContext, db: Db, sourceId: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const step: any = ctx.step;
    const attempts = step.attemptCount ?? step.attempt_count ?? 1;
    const max = step.maxAttempts ?? step.max_attempts ?? 3;
    const nonRetryable = (e as any)?.retryable === false || (e as any)?.status === 422;
    if (attempts >= max || nonRetryable) {
      await setState(db, sourceId, 'failed', { processing_error: `${ctx.step.label} failed: ${(e as Error).message}` }).catch(() => {});
    }
    throw e;
  }
}

export async function extractStep(ctx: StepHandlerContext, db: Db = getServiceClient()) {
  const sourceId = ctx.job.sourceId as string;
  return guard(ctx, db, sourceId, async () => {
    await setState(db, sourceId, 'extracting', { processing_error: null });
    const src = await loadSource(db, sourceId);
    let pages: { pageNumber: number | null; text: string }[];
    let pageCount: number | null = null;
    let vision: { pageNumber: number; mode: string }[] = [];
    let visionPlanned = 0;
    if (src.file_path) {
      const { data, error } = await db.storage.from(KNOWLEDGE_BUCKET).download(src.file_path);
      if (error || !data) throw new Error(`The uploaded file could not be read from storage: ${error?.message ?? 'missing'}`);
      const type = (detectSourceType(src.original_filename ?? src.file_path, src.mime_type) ?? 'txt') as SourceType;
      const bytes = new Uint8Array(await data.arrayBuffer());
      const r = await extractText(bytes, type, { allowEmpty: true });
      pages = r.pages;
      pageCount = r.pageCount;
      const planned = await planVision(db, src, type, bytes, pages.map((p) => p.text));
      visionPlanned = planned.plan.length;
      vision = planned.toRead;
      if (r.charCount === 0 && visionPlanned === 0) {
        throw Object.assign(new Error('No readable text or images were found in this file.'), { retryable: false, status: 422 });
      }
    } else if (src.raw_content) {
      const raw = String(src.raw_content);
      pages = [{ pageNumber: null, text: src.type === 'transcript' && raw.includes('-->') ? cleanCaptions(raw) : raw }];
    } else {
      throw Object.assign(new Error('Source has neither a file nor text content.'), { retryable: false });
    }
    if (vision.length) {
      await ctx.deps.db.addSteps(ctx.job.id, vision.map((v, i) => ({
        key: visionStepKey(v.pageNumber), label: `Read images on page ${v.pageNumber}`, seq: 1000 + i, // display after analysis; runs in parallel with chunking
        dependsOn: ['extract'], input: { pageNumber: v.pageNumber, mode: v.mode },
      })));
    }
    const hasPages = pages.some((p) => p.pageNumber !== null);
    const raw = pages.map((p) => p.text).join(PAGE_BREAK);
    await setState(db, sourceId, 'extracted', { raw_content: raw, page_count: pageCount, metadata: { ...(src.metadata ?? {}), paged: hasPages, visionSteps: vision.map((v) => visionStepKey(v.pageNumber)), visionPages: visionPlanned } });
    return { output: { pageCount, charCount: raw.length, visionPages: visionPlanned, visionToRead: vision.length } };
  });
}

export async function chunkStep(ctx: StepHandlerContext, db: Db = getServiceClient()) {
  const sourceId = ctx.job.sourceId as string;
  return guard(ctx, db, sourceId, async () => {
    await setState(db, sourceId, 'chunking');
    const src = await loadSource(db, sourceId);
    const paged = Boolean(src.metadata?.paged);
    const verified = await verifiedReadings(db, sourceId);
    const pages = String(src.raw_content ?? '').split(PAGE_BREAK).map((text, i) => {
      const n = paged ? i + 1 : 1;
      const extra = verified.get(n);
      return { pageNumber: paged ? i + 1 : null, text: extra ? `${text}${verifiedBlock(n, extra)}`.trim() : text };
    });
    const chunks = chunkPages(pages.filter((p) => p.text.trim().length > 0));
    await markIncluded(db, sourceId, [...verified.keys()]);
    // idempotent: replace this source's chunks
    const del = await db.from('source_chunks').delete().eq('source_id', sourceId);
    if (del.error) throw new Error(`Could not clear old chunks: ${del.error.message}`);
    for (let i = 0; i < chunks.length; i += 200) {
      const rows = chunks.slice(i, i + 200).map((c) => ({
        organization_id: src.organization_id,
        source_id: sourceId,
        chunk_index: c.chunkIndex,
        content: c.content,
        token_count: c.tokenCount,
        page_number: c.pageNumber,
        section_title: c.sectionTitle,
        metadata: {},
      }));
      const ins = await db.from('source_chunks').insert(rows);
      if (ins.error) throw new Error(`Could not save chunks: ${ins.error.message}`);
    }
    await setState(db, sourceId, 'chunked', { chunk_count: chunks.length });

    // Fan out: embeddings + one analysis step per batch, then finalize.
    const batches = Math.ceil(chunks.length / ANALYZE_BATCH_SIZE);
    const analyzeKeys = Array.from({ length: batches }, (_, i) => `analyze:${i}`);
    await ctx.deps.db.addSteps(ctx.job.id, [
      { key: 'embed', label: 'Index for search', seq: 3, dependsOn: ['chunk'] },
      ...analyzeKeys.map((key, i) => ({
        key,
        label: `Analyze knowledge (part ${i + 1} of ${batches})`,
        seq: 10 + i,
        dependsOn: ['chunk'],
        input: { fromIndex: i * ANALYZE_BATCH_SIZE, toIndex: (i + 1) * ANALYZE_BATCH_SIZE - 1 },
      })),
      { key: 'finalize', label: 'Build concept graph', seq: 5000, dependsOn: ['embed', ...analyzeKeys, ...((src.metadata?.visionSteps ?? []) as string[])] },
    ]);
    return { output: { chunkCount: chunks.length, analysisBatches: batches } };
  });
}

export async function embedStep(ctx: StepHandlerContext, db: Db = getServiceClient()) {
  const sourceId = ctx.job.sourceId as string;
  const provider = getEmbeddingProvider();
  if (provider.name === 'none') {
    return { output: { skipped: true, reason: 'No embedding provider configured; full-text search will be used.' } };
  }
  return guard(ctx, db, sourceId, async () => {
    await setState(db, sourceId, 'indexing');
    const { data, error } = await db.from('source_chunks').select('id, content').eq('source_id', sourceId).order('chunk_index');
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const vectors = await provider.embed(rows.map((r: any) => r.content));
    for (let i = 0; i < rows.length; i++) {
      const up = await db.from('source_chunks').update({ embedding: JSON.stringify(vectors[i]) }).eq('id', (rows[i] as any).id);
      if (up.error) throw new Error(`Could not store embedding: ${up.error.message}`);
    }
    return { output: { embedded: rows.length, provider: provider.name } };
  });
}

async function lockedKnowledge(db: Db, orgId: string): Promise<LockedKnowledge[]> {
  const { data } = await db.from('concept_locks').select('concept_id, concepts(name, short_definition, formula)').eq('organization_id', orgId).limit(200);
  return (data ?? []).map((r: any) => ({
    conceptName: r.concepts?.name ?? 'Locked concept',
    statement: [r.concepts?.short_definition, r.concepts?.formula && `Formula: ${r.concepts.formula}`].filter(Boolean).join(' '),
  }));
}

export async function analyzeStep(ctx: StepHandlerContext, db: Db = getServiceClient()) {
  const sourceId = ctx.job.sourceId as string;
  return guard(ctx, db, sourceId, async () => {
    await setState(db, sourceId, 'analyzing');
    const src = await loadSource(db, sourceId);
    const { fromIndex, toIndex } = (ctx.input ?? {}) as { fromIndex: number; toIndex: number };
    const { data: chunkRows, error } = await db
      .from('source_chunks').select('id, chunk_index, content, page_number, section_title')
      .eq('source_id', sourceId).gte('chunk_index', fromIndex).lte('chunk_index', toIndex).order('chunk_index');
    if (error) throw new Error(error.message);
    const chunks: EvidenceChunk[] = (chunkRows ?? []).map((c: any) => ({
      id: c.id, sourceTitle: src.title, pageNumber: c.page_number, sectionTitle: c.section_title, authority: src.authority_level, content: c.content,
    }));
    if (chunks.length === 0) return { output: { concepts: 0, skipped: true } };

    const { data: existing } = await db.from('concepts').select('name').eq('organization_id', src.organization_id).eq('created_by', src.created_by).is('archived_at', null).limit(500);
    const result = await gateway(db).generateStructured({
      ...buildKnowledgeAnalystRequest({
        source: { title: src.title, authority: src.authority_level, author: src.author ?? undefined },
        chunks,
        existingConceptNames: (existing ?? []).map((e: any) => e.name),
        locked: await lockedKnowledge(db, src.organization_id),
      }),
      context: { organizationId: src.organization_id, userId: ctx.job.createdBy, jobId: ctx.job.id, jobStepId: ctx.step.id },
    });
    const { output, dropped } = sanitizeConceptRefs(result.data as KnowledgeAnalystOutput, chunks.map((c) => c.id));
    const saved = await saveConcepts(db, src, output);
    return {
      output: { concepts: saved.length, droppedUncitedConcepts: dropped.concepts, relationships: collectRelationships(output), contradictions: output.contradictions.length },
      meta: { model: result.meta.model, usage: result.meta.usage, estimatedCostUsd: result.meta.estimatedCostUsd },
    };
  });
}

function collectRelationships(out: KnowledgeAnalystOutput) {
  return out.concepts.flatMap((c) => c.relationships.map((r) => ({ from: c.name, to: r.targetName, type: r.type })));
}

async function saveConcepts(db: Db, src: Record<string, any>, out: KnowledgeAnalystOutput) {
  const savedIds: string[] = [];
  for (const c of out.concepts) {
    const { data: found } = await db.from('concepts').select('id')
      .eq('organization_id', src.organization_id).eq('created_by', src.created_by).ilike('name', c.name).is('archived_at', null).maybeSingle();
    const row = {
      organization_id: src.organization_id,
      name: c.name,
      short_definition: c.shortDefinition,
      extended_explanation: c.extendedExplanation,
      summary: c.shortDefinition,
      category: c.category,
      formula: c.formula,
      examples: c.examples,
      warnings: c.warnings,
      kind: c.kind,
      is_official_methodology: c.isOfficialMethodology,
      uncertainty: c.uncertainty,
      authority_level: src.authority_level,
      visibility: src.visibility,
      origin: 'ai',
      created_by: src.created_by,
      created_by_source_id: src.id,
      metadata: { possibleDuplicateOf: c.possibleDuplicateOf },
    };
    let id = (found as any)?.id as string | undefined;
    if (id) {
      // never overwrite human-approved concepts; only attach new evidence
      const { data: cur } = await db.from('concepts').select('review_status').eq('id', id).single();
      if ((cur as any)?.review_status !== 'approved') await db.from('concepts').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
    } else {
      const ins = await db.from('concepts').insert(row).select('id').single();
      if (ins.error) throw new Error(`Could not save concept "${c.name}": ${ins.error.message}`);
      id = (ins.data as any).id;
    }
    savedIds.push(id!);
    const ref = c.sourceRefs[0];
    await db.from('concept_sources').upsert(
      { concept_id: id, source_id: src.id, chunk_id: ref.chunkId, quote: ref.quote.slice(0, 300), page_number: ref.page, notes: c.sourceRefs.length > 1 ? `${c.sourceRefs.length} supporting passages` : null },
      { onConflict: 'concept_id,source_id' },
    );
  }
  for (const k of out.contradictions) {
    const { data: concept } = await db.from('concepts').select('id').eq('organization_id', src.organization_id).ilike('name', k.conceptName).limit(1).maybeSingle();
    await db.from('source_conflicts').insert({
      organization_id: src.organization_id, source_a_id: src.id, source_b_id: src.id, concept_id: (concept as any)?.id ?? null,
      description: k.note || `Conflicting statements about ${k.conceptName}`, statement_a: k.statementA, statement_b: k.statementB,
      chunk_a_id: k.chunkIdA, chunk_b_id: k.chunkIdB, recommended_treatment: 'Instructor decision required: choose the authoritative statement or mark both as context-dependent.',
    });
  }
  return savedIds;
}

export async function finalizeStep(ctx: StepHandlerContext, db: Db = getServiceClient()) {
  const sourceId = ctx.job.sourceId as string;
  return guard(ctx, db, sourceId, async () => {
    const src = await loadSource(db, sourceId);
    const full = await ctx.deps.db.getJobWithSteps(ctx.job.id);
    const rels = (full?.steps ?? []).filter((s) => s.key.startsWith('analyze:')).flatMap((s: any) => (s.output?.relationships ?? []) as { from: string; to: string; type: string }[]);
    let linked = 0;
    for (const r of rels) {
      const find = (n: string) => db.from('concepts').select('id').eq('organization_id', src.organization_id).eq('created_by', src.created_by).ilike('name', n).is('archived_at', null).limit(1).maybeSingle();
      const [a, b] = await Promise.all([find(r.from), find(r.to)]);
      if (!(a.data as any)?.id || !(b.data as any)?.id) continue;
      const up = await db.from('concept_relationships').upsert(
        { concept_id: (a.data as any).id, related_concept_id: (b.data as any).id, relationship_type: r.type },
        { onConflict: 'concept_id,related_concept_id,relationship_type', ignoreDuplicates: true },
      );
      if (!up.error) linked++;
    }
    const { count: conceptCount } = await db.from('concept_sources').select('concept_id', { count: 'exact', head: true }).eq('source_id', sourceId);
    const { count: conflicts } = await db.from('source_conflicts').select('id', { count: 'exact', head: true }).eq('source_a_id', sourceId).eq('status', 'open');
    const pagesToReview = await pagesAwaitingReview(db, sourceId);
    const state = (conflicts ?? 0) > 0 || pagesToReview > 0 ? 'needs_review' : 'ready';
    await setState(db, sourceId, state, { concept_count: conceptCount ?? 0, processed_at: new Date().toISOString(), processing_error: null, metadata: { ...(src.metadata ?? {}), pagesToReview } });
    return { output: { state, concepts: conceptCount ?? 0, relationshipsLinked: linked, openConflicts: conflicts ?? 0, pagesToReview } };
  });
}

export function registerKnowledgeHandlers() {
  registerStepHandler('source.process', 'extract', (ctx) => extractStep(ctx));
  registerStepHandler('source.process', 'chunk', (ctx) => chunkStep(ctx));
  registerStepHandler('source.process', 'embed', (ctx) => embedStep(ctx));
  registerStepHandler('source.process', /^analyze:\d+$/, (ctx) => analyzeStep(ctx));
  registerStepHandler('source.process', /^vision:\d+$/, (ctx) => visionStep(ctx, getServiceClient()));
  registerStepHandler('source.process', 'finalize', (ctx) => finalizeStep(ctx));
}

export const SOURCE_PROCESS_STEPS = [
  { key: 'extract', label: 'Extract text', seq: 1 },
  { key: 'chunk', label: 'Split into passages', seq: 2, dependsOn: ['extract'] },
];
