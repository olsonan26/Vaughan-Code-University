import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AlertTriangle, Archive, ExternalLink, Lock, RotateCw, Save } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/shared/Button';
import { Tabs } from '../../components/shared/Tabs';
import { Badge } from '../../components/shared/Badge';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { ApiError } from '../../services/api/client';
import { useStudioPermissions } from '../instructor/permissions';
import { SourceStateBadge, AuthorityBadge } from './badges';
import { knowledgeApi, isBusy, formatBytes, AUTHORITY_LABEL, STATE_LABEL, type KnowledgeSource, type SourceChunk, type Visibility } from './api';

type Detail = Awaited<ReturnType<typeof knowledgeApi.get>>;

const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: 'Private (only me)', course_team: 'Course team', organization: 'Organization', canonical_shared: 'Canonical shared library',
};

export const SourceDetailPage: React.FC = () => {
  const { sourceId = '' } = useParams();
  const navigate = useNavigate();
  const { can } = useStudioPermissions();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState('concepts');

  const load = useCallback(async () => {
    try {
      setDetail(await knowledgeApi.get(sourceId));
      setError(null);
    } catch (e) {
      setError(e as Error);
    }
  }, [sourceId]);
  useEffect(() => { load(); }, [load]);

  const busy = detail ? isBusy(detail.source.processing_state) : false;
  useEffect(() => {
    if (!busy) return;
    const i = setInterval(load, 3000);
    return () => clearInterval(i);
  }, [busy, load]);

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <ErrorState title={notFound ? 'Source not found' : 'Couldn’t load this source'} whatFailed={notFound ? 'It doesn’t exist or you don’t have access to it.' : error.message} onRetry={notFound ? undefined : load} />;
  }
  if (!detail) return <LoadingState label="Loading source…" />;
  const s = detail.source;

  return (
    <div className="space-y-6">
      <PageHeader
        title={s.title}
        breadcrumbs={[{ label: 'Knowledge Vault', to: '/instructor/knowledge' }, { label: s.title }]}
        actions={<div className="flex items-center gap-2"><AuthorityBadge level={s.authority_level} /><SourceStateBadge state={s.processing_state} /></div>}
      />

      <ProcessingPanel detail={detail} onReprocess={async () => { await knowledgeApi.reprocess(s.id); load(); }} />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Tabs
            tabs={[
              { id: 'concepts', label: 'Concepts', badge: detail.concepts.length || undefined },
              { id: 'text', label: 'Extracted text' },
              { id: 'conflicts', label: 'Conflicts', badge: detail.conflicts.filter((c) => c.status === 'open').length || undefined },
            ]}
            activeTabId={tab}
            onChange={setTab}
          />
          {tab === 'concepts' && <ConceptsList detail={detail} />}
          {tab === 'text' && <ChunksList sourceId={s.id} ready={!busy} />}
          {tab === 'conflicts' && <ConflictsList detail={detail} onChange={load} />}
        </div>
        <MetadataPanel
          source={s}
          canSetAuthority={can('knowledge.set_authority')}
          onSaved={(src) => setDetail((d) => (d ? { ...d, source: src } : d))}
          onArchived={() => navigate('/instructor/knowledge')}
        />
      </div>
    </div>
  );
};

const ProcessingPanel: React.FC<{ detail: Detail; onReprocess: () => Promise<void> }> = ({ detail, onReprocess }) => {
  const s = detail.source;
  const job = detail.latestJob;
  const [working, setWorking] = useState(false);
  if (s.processing_state === 'ready' && !job?.error) return null;
  const failed = s.processing_state === 'failed';
  return (
    <section className={`rounded-2xl border p-5 ${failed ? 'border-rose-200 bg-rose-50' : 'border-indigo-100 bg-indigo-50/60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{failed ? 'Processing failed' : STATE_LABEL[s.processing_state]}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {failed
              ? `${s.processing_error ?? 'Unknown error.'} The original file is safe and unchanged.`
              : job ? `${job.current_stage ?? 'Working'} · ${job.progress ?? 0}% · you can leave this page, processing continues.` : 'Waiting for a worker…'}
          </p>
        </div>
        <div className="flex gap-2">
          {job && <Link to={`/instructor/jobs/${job.id}`} className="text-xs font-semibold text-indigo-700 hover:underline self-center">View job</Link>}
          {failed && (
            <Button size="sm" isLoading={working} leftIcon={<RotateCw className="w-4 h-4" />} onClick={async () => { setWorking(true); try { await onReprocess(); } finally { setWorking(false); } }}>
              Retry processing
            </Button>
          )}
        </div>
      </div>
      {!failed && job && (
        <div className="mt-3 h-1.5 rounded-full bg-white overflow-hidden" role="progressbar" aria-valuenow={job.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${Math.max(3, job.progress ?? 0)}%` }} />
        </div>
      )}
    </section>
  );
};

const ConceptsList: React.FC<{ detail: Detail }> = ({ detail }) => {
  if (detail.concepts.length === 0) {
    return <EmptyState title={isBusy(detail.source.processing_state) ? 'Concepts will appear as analysis runs' : 'No concepts were extracted'} description="Every concept must cite a passage from this source, otherwise it’s discarded." />;
  }
  return (
    <ul className="space-y-3">
      {detail.concepts.map((e, i) => e.concepts && (
        <li key={`${e.concepts.id}-${i}`} className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{e.concepts.name}</p>
            {e.concepts.kind && <Badge size="sm" variant="slate">{e.concepts.kind}</Badge>}
            {e.concepts.uncertainty && e.concepts.uncertainty !== 'low' && <Badge size="sm" variant="amber">{e.concepts.uncertainty} certainty</Badge>}
          </div>
          {e.concepts.short_definition && <p className="text-sm text-slate-700 mt-1">{e.concepts.short_definition}</p>}
          {e.concepts.formula && <p className="text-xs font-mono mt-2 bg-slate-50 inline-block px-2 py-0.5 rounded">{e.concepts.formula}</p>}
          {e.quote && (
            <blockquote className="mt-3 border-l-2 border-indigo-300 pl-3 text-xs text-slate-600 italic">
              “{e.quote}”{e.page_number ? <span className="not-italic text-slate-400"> · p. {e.page_number}</span> : null}
            </blockquote>
          )}
        </li>
      ))}
    </ul>
  );
};

const ChunksList: React.FC<{ sourceId: string; ready: boolean }> = ({ sourceId, ready }) => {
  const [items, setItems] = useState<SourceChunk[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const more = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const res = await knowledgeApi.chunks(sourceId, offset);
      setItems((x) => (offset === 0 ? res.items : [...x, ...res.items]));
      setDone(res.items.length < 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sourceId]);
  useEffect(() => { more(0); }, [more, ready]);
  if (error) return <ErrorState title="Couldn’t load extracted text" whatFailed={error} onRetry={() => more(0)} />;
  if (!loading && items.length === 0) return <EmptyState title="No extracted text yet" />;
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <article key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 mb-1">
            Passage {c.chunk_index + 1}{c.page_number ? ` · page ${c.page_number}` : ''}{c.section_title ? ` · ${c.section_title}` : ''}
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
        </article>
      ))}
      {!done && <Button variant="secondary" size="sm" isLoading={loading} onClick={() => more(items.length)}>Load more</Button>}
    </div>
  );
};

const ConflictsList: React.FC<{ detail: Detail; onChange: () => void }> = ({ detail, onChange }) => {
  if (detail.conflicts.length === 0) return <EmptyState title="No conflicts found" description="When sources disagree, the AI records a conflict here instead of silently choosing." />;
  return (
    <ul className="space-y-3">
      {detail.conflicts.map((c) => (
        <li key={c.id} className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-bold text-slate-900 flex-1">{c.description ?? 'Source conflict'}</p>
            <Badge size="sm" variant={c.status === 'open' ? 'amber' : 'slate'}>{c.status}</Badge>
          </div>
          {c.statement_a && <p className="text-xs text-slate-700"><span className="font-semibold">A:</span> {c.statement_a}</p>}
          {c.statement_b && <p className="text-xs text-slate-700"><span className="font-semibold">B:</span> {c.statement_b}</p>}
          {c.recommended_treatment && <p className="text-xs text-indigo-800 bg-indigo-50 rounded-lg p-2">Recommended: {c.recommended_treatment}</p>}
          {c.status === 'open' && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={async () => { await knowledgeApi.updateConflict(c.id, { status: 'resolved' }); onChange(); }}>Mark resolved</Button>
              <Button size="sm" variant="ghost" onClick={async () => { await knowledgeApi.updateConflict(c.id, { status: 'ignored' }); onChange(); }}>Ignore</Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

const MetadataPanel: React.FC<{ source: KnowledgeSource; canSetAuthority: boolean; onSaved: (s: KnowledgeSource) => void; onArchived: () => void }> = ({ source, canSetAuthority, onSaved, onArchived }) => {
  const [form, setForm] = useState({ title: source.title, description: source.description ?? '', author: source.author ?? '', authorityLevel: source.authority_level, visibility: source.visibility });
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [impact, setImpact] = useState<string[] | null>(null);
  useEffect(() => {
    setForm({ title: source.title, description: source.description ?? '', author: source.author ?? '', authorityLevel: source.authority_level, visibility: source.visibility });
  }, [source.id, source.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = form.title !== source.title || form.description !== (source.description ?? '') || form.author !== (source.author ?? '') ||
    form.authorityLevel !== source.authority_level || form.visibility !== source.visibility;

  const save = async () => {
    setState('saving'); setMsg(null);
    try {
      const res = await knowledgeApi.update(source.id, {
        expectedVersion: source.version, title: form.title, description: form.description || null, author: form.author || null,
        ...(form.authorityLevel !== source.authority_level ? { authorityLevel: form.authorityLevel } : {}),
        ...(form.visibility !== source.visibility ? { visibility: form.visibility } : {}),
      });
      onSaved(res.source);
      setState('saved');
    } catch (e) {
      setState('error');
      setMsg(e instanceof ApiError && e.status === 409 ? 'Someone else changed this source. Reload to see their edit; your changes are still in the form.' : (e as Error).message);
    }
  };

  const openArchive = async () => {
    setArchiveOpen(true); setImpact(null);
    try {
      const i = await knowledgeApi.impact(source.id);
      setImpact([`${i.concepts} concepts cite this source`, `${i.courses} courses use it`, `${i.chunks} extracted passages`]);
    } catch { setImpact(['Impact could not be calculated']); }
  };

  const field = 'mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <aside className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 h-fit">
      <h2 className="text-sm font-bold text-slate-900">Source details</h2>
      <label className="block text-xs font-semibold text-slate-700">Title<input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label className="block text-xs font-semibold text-slate-700">Author<input className={field} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label>
      <label className="block text-xs font-semibold text-slate-700">Description<textarea rows={3} className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="block text-xs font-semibold text-slate-700">Authority
        <select className={field} value={form.authorityLevel} onChange={(e) => setForm({ ...form, authorityLevel: Number(e.target.value) })}>
          {[5, 4, 3, 2, 1].map((l) => <option key={l} value={l} disabled={!canSetAuthority && l >= 4}>L{l} · {AUTHORITY_LABEL[l]}</option>)}
        </select>
        {!canSetAuthority && <span className="block mt-1 font-normal text-slate-500">Canonical and approved levels are set by the Headmaster or an admin.</span>}
      </label>
      <label className="block text-xs font-semibold text-slate-700">Visibility
        <select className={field} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}>
          {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => <option key={v} value={v} disabled={!canSetAuthority && v === 'canonical_shared'}>{VISIBILITY_LABEL[v]}</option>)}
        </select>
      </label>
      {msg && <p role="alert" className="text-xs text-rose-600">{msg}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!dirty} isLoading={state === 'saving'} leftIcon={<Save className="w-4 h-4" />} onClick={save}>Save</Button>
        {state === 'saved' && !dirty && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
      <dl className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-4">
        {source.original_filename && <div><dt className="inline font-semibold">File: </dt><dd className="inline">{source.original_filename} {formatBytes(source.file_size_bytes)}</dd></div>}
        {source.page_count ? <div><dt className="inline font-semibold">Pages: </dt><dd className="inline">{source.page_count}</dd></div> : null}
        <div><dt className="inline font-semibold">Added: </dt><dd className="inline">{new Date(source.created_at).toLocaleString()}</dd></div>
        {source.processed_at && <div><dt className="inline font-semibold">Processed: </dt><dd className="inline">{new Date(source.processed_at).toLocaleString()}</dd></div>}
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {source.original_filename && (
          <Button size="sm" variant="secondary" leftIcon={<ExternalLink className="w-4 h-4" />}
            onClick={async () => { const { url } = await knowledgeApi.fileUrl(source.id); window.open(url, '_blank', 'noopener'); }}>
            Open original
          </Button>
        )}
        <Button size="sm" variant="ghost" leftIcon={<Archive className="w-4 h-4" />} onClick={openArchive}>Archive</Button>
      </div>
      {source.authority_level >= 5 && <p className="text-xs text-purple-700 flex items-center gap-1"><Lock className="w-3 h-3" /> Canonical: AI prefers this source over everything else.</p>}
      <ConfirmDialog
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={async () => { await knowledgeApi.archive(source.id); setArchiveOpen(false); onArchived(); }}
        title="Archive this source?"
        description="It’s hidden from new courses and retrieval but not deleted, and it can be restored. Archiving may affect source verification of content that cites it."
        scopeItems={impact ?? ['Calculating impact…']}
        confirmText="Archive"
        variant="danger"
      />
    </aside>
  );
};

export default SourceDetailPage;
