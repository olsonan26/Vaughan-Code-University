import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { HttpError } from '../lib/errors.js';
import { parseBody } from '../lib/validate.js';
import { getServiceClient } from '../lib/supabase.js';
import { logActivity } from '../lib/activity.js';
import { BUCKET_RULES, buildStoragePath, createSignedDownloadUrl, createSignedUploadUrl, validateStorageUpload } from '../lib/storage.js';
import { enqueueJob } from '../jobs/queue.js';
import { kickWorker } from './jobs.js';
import { detectSourceType, sha256Hex } from '../knowledge/extract.js';
import { KNOWLEDGE_BUCKET, SOURCE_PROCESS_STEPS } from '../knowledge/processor.js';
import { assertAuthorityChange, assertCanEdit, assertCanRead } from '../knowledge/access.js';

export const knowledgeRoutes = new Hono<AppEnv>();
knowledgeRoutes.use('*', requireAuth(), requirePermission('studio.access'));

const db = () => getServiceClient();
const PUBLIC_COLUMNS =
  'id, organization_id, title, type, original_filename, file_size_bytes, mime_type, processing_state, processing_error, authority_level, visibility, author, description, publication_date, source_version_label, page_count, chunk_count, concept_count, checksum_sha256, version, created_by, created_at, updated_at, processed_at, archived_at, metadata';

async function getSource(id: string) {
  const { data, error } = await db().from('knowledge_sources').select(PUBLIC_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new HttpError(500, 'db_error', error.message);
  return data as Record<string, any> | null;
}

async function startProcessing(c: any, source: { id: string; organization_id: string }, reason: string) {
  const auth = c.get('auth');
  await db().from('knowledge_sources').update({ processing_state: 'queued', processing_error: null }).eq('id', source.id);
  const job = await enqueueJob({
    organizationId: source.organization_id,
    createdBy: auth.userId,
    type: 'source.process',
    sourceId: source.id,
    input: { reason },
    idempotencyKey: `source.process:${source.id}:${Date.now()}`,
    steps: SOURCE_PROCESS_STEPS,
  });
  kickWorker(c);
  return job;
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', vtt: 'text/vtt', srt: 'application/x-subrip',
};

/** 1) Request an upload slot: validates type/size, creates the source record, returns a signed upload URL. */
const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().max(150).default(''),
  sizeBytes: z.number().int().positive(),
  checksumSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  title: z.string().max(300).optional(),
});
knowledgeRoutes.post('/uploads', requirePermission('knowledge.upload'), async (c) => {
  const auth = c.get('auth');
  const body = await parseBody(c, uploadSchema);
  const type = detectSourceType(body.filename, body.mimeType);
  if (!type) {
    throw new HttpError(400, 'invalid_file', `${body.filename} is not a supported type. Allowed: PDF, DOCX, TXT, MD, CSV, PNG, JPG, WEBP, VTT, SRT.`);
  }
  const mime = body.mimeType || MIME_BY_EXT[body.filename.split('.').pop()?.toLowerCase() ?? ''] || 'application/octet-stream';
  validateStorageUpload(KNOWLEDGE_BUCKET, mime, body.sizeBytes, body.filename);

  if (body.checksumSha256) {
    const { data: dup } = await db().from('knowledge_sources').select('id, title')
      .eq('organization_id', auth.organizationId).eq('created_by', auth.userId).eq('checksum_sha256', body.checksumSha256).is('archived_at', null).maybeSingle();
    if (dup) throw new HttpError(409, 'duplicate', `This file is already in your vault as "${(dup as any).title}".`, { details: { sourceId: (dup as any).id } });
  }

  const id = crypto.randomUUID();
  const path = buildStoragePath(auth.organizationId, id, body.filename);
  const { error } = await db().from('knowledge_sources').insert({
    id,
    organization_id: auth.organizationId,
    title: body.title?.trim() || body.filename.replace(/\.[^.]+$/, ''),
    type,
    original_filename: body.filename,
    file_path: path,
    file_size_bytes: body.sizeBytes,
    mime_type: mime,
    checksum_sha256: body.checksumSha256 ?? null,
    processing_state: 'uploaded',
    created_by: auth.userId,
  });
  if (error) throw new HttpError(500, 'db_error', `Could not create the source record: ${error.message}`);
  const signed = await createSignedUploadUrl(KNOWLEDGE_BUCKET, path);
  return c.json({ sourceId: id, upload: { signedUrl: signed.signedUrl, token: signed.token, path } }, 201);
});

/** 2) Confirm the browser finished uploading; verifies the object exists and starts processing. */
knowledgeRoutes.post('/sources/:id/complete', requirePermission('knowledge.upload'), async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanEdit(auth, src);
  const { data: full } = await db().from('knowledge_sources').select('file_path').eq('id', src!.id).single();
  const filePath = (full as any)?.file_path as string;
  const folder = filePath.split('/').slice(0, -1).join('/');
  const name = filePath.split('/').pop()!;
  const { data: listed, error } = await db().storage.from(KNOWLEDGE_BUCKET).list(folder, { search: name });
  if (error || !listed?.some((o) => o.name === name)) {
    throw new HttpError(409, 'upload_incomplete', 'The file has not finished uploading. Please upload it again.');
  }
  const job = await startProcessing(c, src as any, 'upload');
  await logActivity(c, { action: 'knowledge.uploaded', entityType: 'knowledge_source', entityId: src!.id, metadata: { title: src!.title } });
  return c.json({ sourceId: src!.id, job });
});

/** Pasted text / transcripts. */
const textSchema = z.object({
  title: z.string().min(1).max(300),
  text: z.string().min(20, 'Paste at least a few sentences.').max(2_000_000),
  type: z.enum(['text', 'transcript', 'md']).default('text'),
  author: z.string().max(200).optional(),
});
knowledgeRoutes.post('/text', requirePermission('knowledge.upload'), async (c) => {
  const auth = c.get('auth');
  const body = await parseBody(c, textSchema);
  const checksum = await sha256Hex(body.text);
  const { data: dup } = await db().from('knowledge_sources').select('id, title')
    .eq('organization_id', auth.organizationId).eq('created_by', auth.userId).eq('checksum_sha256', checksum).is('archived_at', null).maybeSingle();
  if (dup) throw new HttpError(409, 'duplicate', `This text is already in your vault as "${(dup as any).title}".`, { details: { sourceId: (dup as any).id } });
  const { data, error } = await db().from('knowledge_sources').insert({
    organization_id: auth.organizationId, title: body.title, type: body.type, raw_content: body.text, author: body.author ?? null,
    checksum_sha256: checksum, file_size_bytes: new TextEncoder().encode(body.text).length, mime_type: 'text/plain', processing_state: 'uploaded', created_by: auth.userId,
  }).select('id, organization_id, title').single();
  if (error) throw new HttpError(500, 'db_error', error.message);
  const job = await startProcessing(c, data as any, 'text');
  await logActivity(c, { action: 'knowledge.uploaded', entityType: 'knowledge_source', entityId: (data as any).id, metadata: { title: body.title, pasted: true } });
  return c.json({ sourceId: (data as any).id, job }, 201);
});

/** List sources visible to the caller (same rules as RLS). */
knowledgeRoutes.get('/sources', async (c) => {
  const auth = c.get('auth');
  const q = c.req.query();
  let query = db().from('knowledge_sources').select(PUBLIC_COLUMNS, { count: 'exact' })
    .eq('organization_id', auth.organizationId).order('created_at', { ascending: false }).limit(Math.min(Number(q.limit) || 50, 200));
  if (q.archived !== 'true') query = query.is('archived_at', null);
  if (q.state) query = query.eq('processing_state', q.state);
  if (q.q) query = query.ilike('title', `%${q.q.replace(/[%_]/g, '')}%`);
  if (!auth.can('knowledge.manage_all')) {
    query = auth.can('knowledge.read_shared')
      ? query.or(`created_by.eq.${auth.userId},visibility.in.(organization,canonical_shared)`)
      : query.eq('created_by', auth.userId);
  }
  const { data, error, count } = await query;
  if (error) throw new HttpError(500, 'db_error', error.message);
  const busy = ['queued', 'extracting', 'extracted', 'chunking', 'chunked', 'indexing', 'analyzing'];
  if ((data ?? []).some((s: any) => busy.includes(s.processing_state) && Date.now() - new Date(s.updated_at).getTime() > 20000)) kickWorker(c);
  return c.json({ items: data ?? [], total: count ?? 0 });
});

knowledgeRoutes.get('/sources/:id', async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanRead(auth, src);
  const [concepts, conflicts, job] = await Promise.all([
    db().from('concept_sources').select('quote, page_number, chunk_id, concepts(id, name, short_definition, kind, formula, review_status, authority_level, uncertainty)').eq('source_id', src!.id).limit(500),
    db().from('source_conflicts').select('*').or(`source_a_id.eq.${src!.id},source_b_id.eq.${src!.id}`).order('created_at', { ascending: false }),
    db().from('generation_jobs').select('id, state, progress, current_stage, error, created_at').eq('source_id', src!.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return c.json({ source: src, concepts: concepts.data ?? [], conflicts: conflicts.data ?? [], latestJob: job.data ?? null });
});

knowledgeRoutes.get('/sources/:id/chunks', async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanRead(auth, src);
  const offset = Math.max(0, Number(c.req.query('offset')) || 0);
  const { data, error } = await db().from('source_chunks').select('id, chunk_index, page_number, section_title, content, token_count')
    .eq('source_id', src!.id).order('chunk_index').range(offset, offset + 49);
  if (error) throw new HttpError(500, 'db_error', error.message);
  return c.json({ items: data ?? [], offset });
});

knowledgeRoutes.get('/sources/:id/file', async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanRead(auth, src);
  const { data } = await db().from('knowledge_sources').select('file_path').eq('id', src!.id).single();
  if (!(data as any)?.file_path) throw new HttpError(404, 'not_found', 'This source has no original file (it was pasted text).');
  const { signedUrl } = await createSignedDownloadUrl(KNOWLEDGE_BUCKET, (data as any).file_path, 300);
  return c.json({ url: signedUrl, expiresIn: 300 });
});

const patchSchema = z.object({
  expectedVersion: z.number().int(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  author: z.string().max(200).nullable().optional(),
  publicationDate: z.string().date().nullable().optional(),
  sourceVersionLabel: z.string().max(50).nullable().optional(),
  authorityLevel: z.number().int().min(1).max(5).optional(),
  visibility: z.enum(['private', 'course_team', 'organization', 'canonical_shared']).optional(),
});
knowledgeRoutes.patch('/sources/:id', async (c) => {
  const auth = c.get('auth');
  const body = await parseBody(c, patchSchema);
  const src = await getSource(c.req.param('id'));
  assertCanEdit(auth, src);
  assertAuthorityChange(auth, body.authorityLevel, body.visibility);
  const update: Record<string, unknown> = { version: src!.version + 1, updated_at: new Date().toISOString() };
  if (body.title !== undefined) update.title = body.title;
  if (body.description !== undefined) update.description = body.description;
  if (body.author !== undefined) update.author = body.author;
  if (body.publicationDate !== undefined) update.publication_date = body.publicationDate;
  if (body.sourceVersionLabel !== undefined) update.source_version_label = body.sourceVersionLabel;
  if (body.authorityLevel !== undefined) update.authority_level = body.authorityLevel;
  if (body.visibility !== undefined) update.visibility = body.visibility;
  const { data, error } = await db().from('knowledge_sources').update(update).eq('id', src!.id).eq('version', body.expectedVersion).select(PUBLIC_COLUMNS).maybeSingle();
  if (error) throw new HttpError(500, 'db_error', error.message);
  if (!data) throw new HttpError(409, 'conflict', 'This source was changed by someone else. Reload to see the latest version before saving.');
  if (body.authorityLevel !== undefined && body.authorityLevel !== src!.authority_level) {
    await db().from('concepts').update({ authority_level: body.authorityLevel }).eq('created_by_source_id', src!.id);
  }
  await logActivity(c, { action: 'knowledge.updated', entityType: 'knowledge_source', entityId: src!.id, metadata: { fields: Object.keys(body).filter((k) => k !== 'expectedVersion'), authorityLevel: body.authorityLevel, visibility: body.visibility } });
  return c.json({ source: data });
});

knowledgeRoutes.post('/sources/:id/reprocess', requirePermission('knowledge.upload'), async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanEdit(auth, src);
  const job = await startProcessing(c, src as any, 'reprocess');
  return c.json({ job });
});

/** What depends on this source (shown before archiving). */
knowledgeRoutes.get('/sources/:id/impact', async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanRead(auth, src);
  const [courses, concepts, chunks] = await Promise.all([
    db().from('course_sources').select('course_id', { count: 'exact', head: true }).eq('source_id', src!.id),
    db().from('concept_sources').select('concept_id', { count: 'exact', head: true }).eq('source_id', src!.id),
    db().from('source_chunks').select('id', { count: 'exact', head: true }).eq('source_id', src!.id),
  ]);
  return c.json({ courses: courses.count ?? 0, concepts: concepts.count ?? 0, chunks: chunks.count ?? 0 });
});

/** Soft delete (archive). Raw files are kept so references stay auditable. */
knowledgeRoutes.post('/sources/:id/archive', async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanEdit(auth, src);
  await db().from('knowledge_sources').update({ archived_at: new Date().toISOString(), version: src!.version + 1 }).eq('id', src!.id);
  await logActivity(c, { action: 'knowledge.archived', entityType: 'knowledge_source', entityId: src!.id, metadata: { title: src!.title } });
  return c.json({ ok: true });
});
knowledgeRoutes.post('/sources/:id/restore', async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanEdit(auth, src);
  await db().from('knowledge_sources').update({ archived_at: null, version: src!.version + 1 }).eq('id', src!.id);
  await logActivity(c, { action: 'knowledge.restored', entityType: 'knowledge_source', entityId: src!.id });
  return c.json({ ok: true });
});

/** Concepts visible to the caller (their own, or shared ones with knowledge.read_shared). */
knowledgeRoutes.get('/concepts', async (c) => {
  const auth = c.get('auth');
  const q = c.req.query();
  let query = db().from('concepts').select('id, name, short_definition, category, kind, formula, authority_level, review_status, uncertainty, visibility, created_by, created_by_source_id, updated_at', { count: 'exact' })
    .eq('organization_id', auth.organizationId).is('archived_at', null).order('name').limit(Math.min(Number(q.limit) || 100, 500));
  if (q.q) query = query.ilike('name', `%${q.q.replace(/[%_]/g, '')}%`);
  if (q.sourceId) {
    const { data: ids } = await db().from('concept_sources').select('concept_id').eq('source_id', q.sourceId);
    query = query.in('id', (ids ?? []).map((r: any) => r.concept_id));
  }
  if (!auth.can('knowledge.manage_all')) {
    query = auth.can('knowledge.read_shared')
      ? query.or(`created_by.eq.${auth.userId},visibility.in.(organization,canonical_shared)`)
      : query.eq('created_by', auth.userId);
  }
  const { data, error, count } = await query;
  if (error) throw new HttpError(500, 'db_error', error.message);
  const { data: locks } = await db().from('concept_locks').select('concept_id').in('concept_id', (data ?? []).map((d: any) => d.id));
  const locked = new Set((locks ?? []).map((l: any) => l.concept_id));
  return c.json({ items: (data ?? []).map((d: any) => ({ ...d, locked: locked.has(d.id) })), total: count ?? 0 });
});

const conceptPatch = z.object({
  expectedVersion: z.number().int(),
  name: z.string().min(1).max(200).optional(),
  shortDefinition: z.string().max(2000).optional(),
  extendedExplanation: z.string().max(20000).optional(),
  formula: z.string().max(1000).nullable().optional(),
  reviewStatus: z.enum(['unreviewed', 'approved', 'rejected', 'needs_review']).optional(),
});
knowledgeRoutes.patch('/concepts/:id', async (c) => {
  const auth = c.get('auth');
  const body = await parseBody(c, conceptPatch);
  const { data: cur } = await db().from('concepts').select('id, organization_id, created_by, version, name').eq('id', c.req.param('id')).maybeSingle();
  if (!cur || (cur as any).organization_id !== auth.organizationId) throw new HttpError(404, 'not_found', 'Concept not found.');
  if ((cur as any).created_by !== auth.userId && !auth.can('knowledge.manage_all')) throw new HttpError(403, 'forbidden', 'Only the owner or a knowledge administrator can edit this concept.');
  const { data: lock } = await db().from('concept_locks').select('concept_id').eq('concept_id', (cur as any).id).maybeSingle();
  if (lock && !auth.can('knowledge.lock')) throw new HttpError(423, 'locked', `"${(cur as any).name}" is locked canonical knowledge. Only the Headmaster can change it.`);
  const upd: Record<string, unknown> = { version: (cur as any).version + 1, updated_at: new Date().toISOString() };
  if (body.name !== undefined) upd.name = body.name;
  if (body.shortDefinition !== undefined) { upd.short_definition = body.shortDefinition; upd.summary = body.shortDefinition; }
  if (body.extendedExplanation !== undefined) upd.extended_explanation = body.extendedExplanation;
  if (body.formula !== undefined) upd.formula = body.formula;
  if (body.reviewStatus !== undefined) {
    upd.review_status = body.reviewStatus;
    if (body.reviewStatus === 'approved') { upd.approved_by = auth.userId; upd.approved_at = new Date().toISOString(); }
  }
  if (body.name || body.shortDefinition || body.extendedExplanation || body.formula !== undefined) upd.origin = 'human';
  const { data, error } = await db().from('concepts').update(upd).eq('id', (cur as any).id).eq('version', body.expectedVersion).select('*').maybeSingle();
  if (error) throw new HttpError(500, 'db_error', error.message);
  if (!data) throw new HttpError(409, 'conflict', 'This concept was changed by someone else. Reload before saving.');
  await logActivity(c, { action: 'concept.updated', entityType: 'concept', entityId: (cur as any).id, metadata: { fields: Object.keys(body) } });
  return c.json({ concept: data });
});

knowledgeRoutes.post('/concepts/:id/lock', requirePermission('knowledge.lock'), async (c) => {
  const auth = c.get('auth');
  const reason = (await c.req.json().catch(() => ({})))?.reason ?? null;
  const { data: cur } = await db().from('concepts').select('id, organization_id, name').eq('id', c.req.param('id')).maybeSingle();
  if (!cur || (cur as any).organization_id !== auth.organizationId) throw new HttpError(404, 'not_found', 'Concept not found.');
  const { error } = await db().from('concept_locks').insert({ organization_id: auth.organizationId, concept_id: (cur as any).id, locked_by: auth.userId, ...(reason ? { reason } : {}) });
  if (error && !/duplicate/i.test(error.message)) throw new HttpError(500, 'db_error', error.message);
  await db().from('concepts').update({ review_status: 'approved', approved_by: auth.userId, approved_at: new Date().toISOString() }).eq('id', (cur as any).id);
  await logActivity(c, { action: 'concept.locked', entityType: 'concept', entityId: (cur as any).id, metadata: { name: (cur as any).name } });
  return c.json({ ok: true });
});
knowledgeRoutes.delete('/concepts/:id/lock', requirePermission('knowledge.lock'), async (c) => {
  const auth = c.get('auth');
  await db().from('concept_locks').delete().eq('concept_id', c.req.param('id')).eq('organization_id', auth.organizationId);
  await logActivity(c, { action: 'concept.unlocked', entityType: 'concept', entityId: c.req.param('id') });
  return c.json({ ok: true });
});

const conflictPatch = z.object({ status: z.enum(['open', 'resolved', 'ignored']), resolutionNotes: z.string().max(5000).optional() });
knowledgeRoutes.patch('/conflicts/:id', async (c) => {
  const auth = c.get('auth');
  const body = await parseBody(c, conflictPatch);
  const { data: cur } = await db().from('source_conflicts').select('id, organization_id, source_a_id').eq('id', c.req.param('id')).maybeSingle();
  if (!cur || (cur as any).organization_id !== auth.organizationId) throw new HttpError(404, 'not_found', 'Conflict not found.');
  const src = await getSource((cur as any).source_a_id);
  assertCanEdit(auth, src);
  const { error } = await db().from('source_conflicts').update({ status: body.status, resolution_notes: body.resolutionNotes ?? null, resolved_by: body.status === 'open' ? null : auth.userId }).eq('id', (cur as any).id);
  if (error) throw new HttpError(400, 'invalid', error.message);
  if (body.status !== 'open' && src) {
    const { count } = await db().from('source_conflicts').select('id', { count: 'exact', head: true }).eq('source_a_id', src.id).eq('status', 'open');
    if ((count ?? 0) === 0 && src.processing_state === 'needs_review') await db().from('knowledge_sources').update({ processing_state: 'ready' }).eq('id', src.id);
  }
  await logActivity(c, { action: 'knowledge.conflict_' + body.status, entityType: 'source_conflict', entityId: (cur as any).id });
  return c.json({ ok: true });
});

/* ---------------- Kate's eyes: page readings the instructor must verify ---------------- */

const PAGE_READ_COLUMNS = 'id, page_number, reason, image_path, primary_model, primary_result, check_model, check_result, agreement, differences, status, final_text, included_in_knowledge, error, verified_at, updated_at';

/** Every page Kate looked at, with a short-lived link to the page image so the instructor can compare. */
knowledgeRoutes.get('/sources/:id/pages', async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanRead(auth, src);
  const { data, error } = await db().from('source_page_reads').select(PAGE_READ_COLUMNS).eq('source_id', src!.id).order('page_number');
  if (error) throw new HttpError(500, 'db_error', error.message);
  const rows = data ?? [];
  const paths = rows.map((r: any) => r.image_path).filter(Boolean) as string[];
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await db().storage.from(KNOWLEDGE_BUCKET).createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  const counts: Record<string, number> = {};
  for (const r of rows as any[]) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const toAdd = (rows as any[]).filter((r) => r.status === 'verified' && !r.included_in_knowledge).length;
  const toRemove = (rows as any[]).filter((r) => r.status !== 'verified' && r.included_in_knowledge).length;
  return c.json({ items: rows.map((r: any) => ({ ...r, image_url: r.image_path ? urls.get(r.image_path) ?? null : null })), counts, pendingRebuild: toAdd + toRemove });
});

const pageReviewSchema = z.object({
  action: z.enum(['verify', 'exclude', 'reopen']),
  finalText: z.string().max(60000).optional(),
});
/** Instructor decision on one page. Only 'verify' lets the text become knowledge (after a rebuild). */
knowledgeRoutes.patch('/sources/:id/pages/:page', async (c) => {
  const auth = c.get('auth');
  const body = await parseBody(c, pageReviewSchema);
  const src = await getSource(c.req.param('id'));
  assertCanEdit(auth, src);
  const page = Number(c.req.param('page'));
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'invalid_page', 'Page must be a positive number.');
  const { data: cur } = await db().from('source_page_reads').select('id, status, final_text').eq('source_id', src!.id).eq('page_number', page).maybeSingle();
  if (!cur) throw new HttpError(404, 'not_found', `Kate has no reading for page ${page}.`);
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  if (body.action === 'verify') {
    const text = (body.finalText ?? (cur as any).final_text ?? '').trim();
    if (!text) throw new HttpError(400, 'empty_text', 'There is no text to verify. Type what the page says, or exclude the page.');
    Object.assign(update, { status: 'verified', final_text: text, verified_by: auth.userId, verified_at: now, error: null });
  } else if (body.action === 'exclude') {
    Object.assign(update, { status: 'excluded', verified_by: auth.userId, verified_at: now });
  } else {
    Object.assign(update, { status: 'needs_review', verified_by: null, verified_at: null });
    if (body.finalText !== undefined) update.final_text = body.finalText;
  }
  const { data, error } = await db().from('source_page_reads').update(update).eq('id', (cur as any).id).select(PAGE_READ_COLUMNS).single();
  if (error) throw new HttpError(500, 'db_error', error.message);
  await logActivity(c, { action: `knowledge.page_${body.action}`, entityType: 'knowledge_source', entityId: src!.id, metadata: { page, edited: body.finalText !== undefined && body.finalText.trim() !== ((cur as any).final_text ?? '').trim() } });
  return c.json({ page: data });
});

/** Verify every page where both readers agreed exactly (the instructor still chooses to do this). */
knowledgeRoutes.post('/sources/:id/pages/verify-agreed', async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanEdit(auth, src);
  const now = new Date().toISOString();
  const { data, error } = await db().from('source_page_reads').update({ status: 'verified', verified_by: auth.userId, verified_at: now, updated_at: now })
    .eq('source_id', src!.id).eq('status', 'agreed').not('final_text', 'is', null).select('page_number');
  if (error) throw new HttpError(500, 'db_error', error.message);
  await logActivity(c, { action: 'knowledge.pages_verified_agreed', entityType: 'knowledge_source', entityId: src!.id, metadata: { pages: (data ?? []).map((r: any) => r.page_number) } });
  return c.json({ verified: (data ?? []).length });
});

/** Rebuild the source's knowledge so verified page text is included (and un-verified text removed). */
knowledgeRoutes.post('/sources/:id/pages/apply', requirePermission('knowledge.upload'), async (c) => {
  const auth = c.get('auth');
  const src = await getSource(c.req.param('id'));
  assertCanEdit(auth, src);
  const job = await startProcessing(c, src as any, 'verified_pages');
  return c.json({ job });
});
