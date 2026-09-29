import { apiFetch } from '../../services/api/client';

export type ProcessingState =
  | 'uploaded' | 'queued' | 'extracting' | 'extracted' | 'chunking' | 'chunked'
  | 'indexing' | 'analyzing' | 'ready' | 'failed' | 'needs_review';

export type Visibility = 'private' | 'course_team' | 'organization' | 'canonical_shared';

export interface KnowledgeSource {
  id: string;
  title: string;
  type: string;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  processing_state: ProcessingState;
  processing_error: string | null;
  authority_level: number;
  visibility: Visibility;
  author: string | null;
  description: string | null;
  publication_date: string | null;
  source_version_label: string | null;
  page_count: number | null;
  chunk_count: number | null;
  concept_count: number | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  archived_at: string | null;
  metadata?: { pagesToReview?: number; visionPages?: number; [k: string]: unknown } | null;
}

export interface ConceptEvidence {
  quote: string | null;
  page_number: number | null;
  chunk_id: string | null;
  concepts: {
    id: string; name: string; short_definition: string | null; kind: string | null; formula: string | null;
    review_status: string; authority_level: number; uncertainty: string | null;
  } | null;
}

export interface SourceConflict {
  id: string; status: string; description: string | null; statement_a: string | null; statement_b: string | null;
  recommended_treatment: string | null; source_a_id: string | null; source_b_id: string | null; created_at: string;
}

export interface ConceptRow {
  id: string; name: string; short_definition: string | null; category: string | null; kind: string | null;
  formula: string | null; authority_level: number; review_status: string; uncertainty: string | null;
  visibility: Visibility; created_by: string | null; version?: number; locked: boolean; updated_at: string;
}

export interface SourceChunk {
  id: string; chunk_index: number; page_number: number | null; section_title: string | null; content: string; token_count: number | null;
}

export const BUSY_STATES: ProcessingState[] = ['uploaded', 'queued', 'extracting', 'extracted', 'chunking', 'chunked', 'indexing', 'analyzing'];
export const isBusy = (s: ProcessingState) => BUSY_STATES.includes(s);

export const STATE_LABEL: Record<ProcessingState, string> = {
  uploaded: 'Uploaded', queued: 'Queued', extracting: 'Extracting text', extracted: 'Text extracted',
  chunking: 'Chunking', chunked: 'Chunked', indexing: 'Indexing', analyzing: 'Analyzing concepts',
  ready: 'Ready', failed: 'Failed', needs_review: 'Needs review',
};

export const AUTHORITY_LABEL: Record<number, string> = {
  5: 'Canonical', 4: 'Approved curriculum', 3: 'Trusted research', 2: 'Working notes', 1: 'External / unverified',
};

export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.csv', '.png', '.jpg', '.jpeg', '.webp', '.vtt', '.srt'];
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type PageReadStatus = 'pending' | 'agreed' | 'needs_review' | 'verified' | 'excluded' | 'error';
export interface VisionReadResult { text: string; visuals: { kind: string; description: string }[]; uncertain: string[]; legible: boolean }
export interface PageRead {
  id: string; page_number: number; reason: string; image_url: string | null;
  primary_model: string | null; primary_result: VisionReadResult | null; check_model: string | null; check_result: VisionReadResult | null;
  agreement: number | null; differences: string[]; status: PageReadStatus; final_text: string | null;
  included_in_knowledge: boolean; error: string | null; verified_at: string | null;
}

export const knowledgeApi = {
  pages: (id: string) => apiFetch<{ items: PageRead[]; counts: Partial<Record<PageReadStatus, number>>; pendingRebuild: number }>(`/knowledge/sources/${id}/pages`),
  reviewPage: (id: string, page: number, body: { action: 'verify' | 'exclude' | 'reopen'; finalText?: string }) =>
    apiFetch<{ page: PageRead }>(`/knowledge/sources/${id}/pages/${page}`, { method: 'PATCH', json: body }),
  verifyAgreed: (id: string) => apiFetch<{ verified: number }>(`/knowledge/sources/${id}/pages/verify-agreed`, { method: 'POST' }),
  applyPages: (id: string) => apiFetch<{ job: { id: string } }>(`/knowledge/sources/${id}/pages/apply`, { method: 'POST' }),
  list: (params: { q?: string; state?: string } = {}, signal?: AbortSignal) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<{ items: KnowledgeSource[]; total: number }>(`/knowledge/sources${qs ? `?${qs}` : ''}`, { signal });
  },
  get: (id: string, signal?: AbortSignal) =>
    apiFetch<{ source: KnowledgeSource; concepts: ConceptEvidence[]; conflicts: SourceConflict[]; latestJob: { id: string; state: string; progress: number; current_stage: string | null; error: string | null } | null }>(`/knowledge/sources/${id}`, { signal }),
  chunks: (id: string, offset = 0) => apiFetch<{ items: SourceChunk[]; offset: number }>(`/knowledge/sources/${id}/chunks?offset=${offset}`),
  fileUrl: (id: string) => apiFetch<{ url: string }>(`/knowledge/sources/${id}/file`),
  createUpload: (body: { filename: string; mimeType: string; sizeBytes: number; checksumSha256?: string; title?: string }) =>
    apiFetch<{ sourceId: string; upload: { signedUrl: string; token: string; path: string } }>(`/knowledge/uploads`, { method: 'POST', json: body }),
  complete: (id: string) => apiFetch<{ sourceId: string; job: { id: string } }>(`/knowledge/sources/${id}/complete`, { method: 'POST' }),
  pasteText: (body: { title: string; text: string; type?: 'text' | 'transcript' | 'md'; author?: string }) =>
    apiFetch<{ sourceId: string; job: { id: string } }>(`/knowledge/text`, { method: 'POST', json: body }),
  update: (id: string, body: Record<string, unknown> & { expectedVersion: number }) =>
    apiFetch<{ source: KnowledgeSource }>(`/knowledge/sources/${id}`, { method: 'PATCH', json: body }),
  reprocess: (id: string) => apiFetch<{ job: { id: string } }>(`/knowledge/sources/${id}/reprocess`, { method: 'POST' }),
  impact: (id: string) => apiFetch<{ courses: number; concepts: number; chunks: number }>(`/knowledge/sources/${id}/impact`),
  archive: (id: string) => apiFetch<{ ok: true }>(`/knowledge/sources/${id}/archive`, { method: 'POST' }),
  restore: (id: string) => apiFetch<{ ok: true }>(`/knowledge/sources/${id}/restore`, { method: 'POST' }),
  concepts: (params: { q?: string; sourceId?: string } = {}, signal?: AbortSignal) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return apiFetch<{ items: ConceptRow[]; total: number }>(`/knowledge/concepts${qs ? `?${qs}` : ''}`, { signal });
  },
  lockConcept: (id: string, reason?: string) => apiFetch<{ ok: true }>(`/knowledge/concepts/${id}/lock`, { method: 'POST', json: { reason } }),
  unlockConcept: (id: string) => apiFetch<{ ok: true }>(`/knowledge/concepts/${id}/lock`, { method: 'DELETE' }),
  updateConflict: (id: string, body: { status: 'open' | 'resolved' | 'ignored'; resolutionNotes?: string }) =>
    apiFetch<{ ok: true }>(`/knowledge/conflicts/${id}`, { method: 'PATCH', json: body }),
};

/** SHA-256 of a file in the browser, used for duplicate detection before uploading. */
export async function sha256Hex(file: File): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle || file.size > MAX_UPLOAD_BYTES) return undefined;
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** PUT the file straight to storage via the signed URL (bypasses the 4.5 MB serverless body limit), with progress. */
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', markdown: 'text/markdown', csv: 'text/csv',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', vtt: 'text/vtt', srt: 'application/x-subrip',
};
/** Browsers often report '' for .vtt/.srt/.md; storage only accepts known types, so fill it in from the extension. */
export const mimeFor = (file: File) => file.type || MIME_BY_EXT[(file.name.split('.').pop() ?? '').toLowerCase()] || 'application/octet-stream';

export function putToSignedUrl(signedUrl: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', mimeFor(file));
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage rejected the upload (HTTP ${xhr.status}): ${xhr.responseText.slice(0, 200)}`)));
    xhr.onerror = () => reject(new Error('Network error while uploading the file. Nothing was saved; you can retry.'));
    xhr.send(file);
  });
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
