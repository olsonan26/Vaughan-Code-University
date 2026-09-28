import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { FileText, FolderOpen, Lock, ClipboardPaste, Search, Unlock } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/shared/Button';
import { Dropzone, FileProgressList, type FileProgressItem } from '../../components/shared/Dropzone';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingState } from '../../components/shared/LoadingState';
import { Tabs } from '../../components/shared/Tabs';
import { Badge } from '../../components/shared/Badge';
import { ApiError } from '../../services/api/client';
import { useStudioPermissions } from '../instructor/permissions';
import { PasteTextDialog } from './PasteTextDialog';
import { SourceStateBadge, AuthorityBadge } from './badges';
import {
  knowledgeApi, isBusy, sha256Hex, putToSignedUrl, mimeFor, formatBytes, ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES, STATE_LABEL,
  type KnowledgeSource, type ConceptRow,
} from './api';

export const KnowledgeVaultPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'concepts' ? 'concepts' : 'sources';
  const { can } = useStudioPermissions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Vault"
        description="The source-grounded knowledge AI is allowed to teach from. Originals stay untouched; concepts are derived and cite their evidence."
      />
      <Tabs
        tabs={[{ id: 'sources', label: 'Sources' }, { id: 'concepts', label: 'Concepts' }]}
        activeTabId={tab}
        onChange={(id) => setParams(id === 'concepts' ? { tab: 'concepts' } : {})}
      />
      {tab === 'sources' ? <SourcesTab canUpload={can('knowledge.upload')} autoOpenUpload={params.get('upload') === '1'} /> : <ConceptsTab canLock={can('knowledge.lock')} />}
    </div>
  );
};

const SourcesTab: React.FC<{ canUpload: boolean; autoOpenUpload: boolean }> = ({ canUpload, autoOpenUpload }) => {
  const [items, setItems] = useState<KnowledgeSource[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [q, setQ] = useState('');
  const [uploads, setUploads] = useState<FileProgressItem[]>([]);
  const [pending, setPending] = useState<Record<string, File>>({});
  const [pasteOpen, setPasteOpen] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await knowledgeApi.list({ q: q.trim() || undefined }, signal);
      setItems(res.items);
      setError(null);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e as Error);
    }
  }, [q]);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => load(ctrl.signal), q ? 250 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [load, q]);

  // Poll while anything is processing, so state reflects the real backend (survives refresh: state lives in the DB).
  const anyBusy = useMemo(() => (items ?? []).some((s) => isBusy(s.processing_state)), [items]);
  useEffect(() => {
    if (!anyBusy) return;
    const i = setInterval(() => load(), 3000);
    return () => clearInterval(i);
  }, [anyBusy, load]);

  const setItem = (name: string, patch: Partial<FileProgressItem>) =>
    setUploads((u) => u.map((x) => (x.name === name ? { ...x, ...patch } : x)));

  const uploadOne = async (file: File) => {
    setItem(file.name, { status: 'uploading', progress: 0, error: undefined });
    try {
      const checksumSha256 = await sha256Hex(file);
      const slot = await knowledgeApi.createUpload({ filename: file.name, mimeType: mimeFor(file), sizeBytes: file.size, checksumSha256 });
      await putToSignedUrl(slot.upload.signedUrl, file, (p) => setItem(file.name, { progress: p }));
      setItem(file.name, { status: 'processing', progress: 100 });
      await knowledgeApi.complete(slot.sourceId);
      setItem(file.name, { status: 'done' });
      load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setItem(file.name, { status: 'error', error: msg });
    }
  };

  const onFiles = (files: File[]) => {
    setUploads((u) => [...u.filter((x) => !files.some((f) => f.name === x.name)), ...files.map((f) => ({ name: f.name, sizeBytes: f.size, progress: 0, status: 'uploading' as const }))]);
    setPending((p) => ({ ...p, ...Object.fromEntries(files.map((f) => [f.name, f])) }));
    files.forEach(uploadOne);
  };

  return (
    <div className="space-y-5">
      {canUpload && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Add knowledge</h2>
              <p className="text-xs text-slate-500">PDF, Word (.docx), TXT, Markdown, CSV, images (PNG/JPG/WEBP) or captions (VTT/SRT) up to 50 MB. Kate reads pictures, charts and scanned pages; you verify what she read before it is used.</p>
            </div>
            <Button variant="secondary" size="sm" leftIcon={<ClipboardPaste className="w-4 h-4" />} onClick={() => setPasteOpen(true)}>
              Paste text or transcript
            </Button>
          </div>
          <Dropzone
            accept={ACCEPTED_EXTENSIONS}
            maxSizeBytes={MAX_UPLOAD_BYTES}
            multiple
            onFiles={onFiles}
            label={autoOpenUpload ? 'Drop your first source here' : 'Drag files here or click to choose'}
          />
          {uploads.length > 0 && (
            <FileProgressList
              items={uploads}
              onRemove={(name) => setUploads((u) => u.filter((x) => x.name !== name))}
              onRetry={(name) => pending[name] && uploadOne(pending[name])}
            />
          )}
        </section>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sources"
            aria-label="Search sources"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {anyBusy && <span className="text-xs text-slate-500">Processing updates live</span>}
      </div>

      {error ? (
        <ErrorState title="Couldn’t load your sources" whatFailed={error.message} whatIsSafe="Your uploaded files are stored safely." onRetry={() => load()} />
      ) : items === null ? (
        <LoadingState label="Loading sources…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={q ? 'No sources match that search' : 'Upload your first source'}
          description={q ? undefined : 'Upload your first source to begin building the University’s AI knowledge base.'}
        />
      ) : (
        <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {items.map((s) => (
            <li key={s.id}>
              <Link to={`/instructor/knowledge/${s.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.title}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {[s.type.toUpperCase(), formatBytes(s.file_size_bytes), s.page_count ? `${s.page_count} pages` : null,
                      s.chunk_count ? `${s.chunk_count} passages` : null, s.concept_count ? `${s.concept_count} concepts` : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                  {s.processing_state === 'failed' && s.processing_error && <p className="text-xs text-rose-600 mt-1 line-clamp-1">{s.processing_error}</p>}
                </div>
                <AuthorityBadge level={s.authority_level} />
                <SourceStateBadge state={s.processing_state} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <PasteTextDialog isOpen={pasteOpen} onClose={() => setPasteOpen(false)} onCreated={() => { setPasteOpen(false); load(); }} />
    </div>
  );
};

const ConceptsTab: React.FC<{ canLock: boolean }> = ({ canLock }) => {
  const [items, setItems] = useState<ConceptRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await knowledgeApi.concepts({ q: q.trim() || undefined }, signal);
      setItems(res.items);
      setError(null);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e as Error);
    }
  }, [q]);
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => load(ctrl.signal), q ? 250 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [load, q]);

  const toggleLock = async (c: ConceptRow) => {
    setBusyId(c.id);
    try {
      if (c.locked) await knowledgeApi.unlockConcept(c.id);
      else await knowledgeApi.lockConcept(c.id, 'Locked from Knowledge Vault');
      await load();
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search concepts" aria-label="Search concepts"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      {error ? (
        <ErrorState title="Couldn’t load concepts" whatFailed={error.message} onRetry={() => load()} />
      ) : items === null ? (
        <LoadingState label="Loading concepts…" />
      ) : items.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No concepts yet" description="Concepts appear here once a source finishes processing." />
      ) : (
        <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {items.map((c) => (
            <li key={c.id} className="px-5 py-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  {c.kind && <Badge size="sm" variant="slate">{c.kind}</Badge>}
                  {c.locked && <Badge size="sm" variant="amber" icon={<Lock className="w-3 h-3" />}>Locked</Badge>}
                  {c.review_status === 'approved' && <Badge size="sm" variant="emerald">Approved</Badge>}
                </div>
                {c.short_definition && <p className="text-sm text-slate-600 mt-1">{c.short_definition}</p>}
                {c.formula && <p className="text-xs font-mono text-slate-700 mt-1 bg-slate-50 inline-block px-2 py-0.5 rounded">{c.formula}</p>}
              </div>
              {canLock && (
                <Button size="sm" variant="ghost" isLoading={busyId === c.id} onClick={() => toggleLock(c)}
                  leftIcon={c.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}>
                  {c.locked ? 'Unlock' : 'Lock'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export { STATE_LABEL };
export default KnowledgeVaultPage;
