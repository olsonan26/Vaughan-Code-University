import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, RotateCcw, Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { Badge } from '../../components/shared/Badge';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import { knowledgeApi, type PageRead, type PageReadStatus } from './api';

const STATUS: Record<PageReadStatus, { label: string; variant: 'slate' | 'amber' | 'emerald' | 'rose' | 'indigo' }> = {
  pending: { label: 'Reading…', variant: 'slate' },
  agreed: { label: 'Both readers agree', variant: 'indigo' },
  needs_review: { label: 'Check this page', variant: 'amber' },
  verified: { label: 'Verified', variant: 'emerald' },
  excluded: { label: 'Excluded', variant: 'slate' },
  error: { label: 'Could not read', variant: 'rose' },
};
const REASON: Record<string, string> = {
  image: 'has pictures', low_text: 'scanned page', graphics: 'has charts or diagrams', image_file: 'uploaded image',
};

/**
 * Kate's eyes review: every page Kate looked at, side by side with the page image.
 * Nothing here becomes knowledge until the instructor verifies it and applies the changes.
 */
export const PageReadsPanel: React.FC<{ sourceId: string; canEdit: boolean; onApplied: () => void }> = ({ sourceId, canEdit, onApplied }) => {
  const [data, setData] = useState<Awaited<ReturnType<typeof knowledgeApi.pages>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todo' | 'all'>('todo');

  const load = useCallback(async () => {
    try { setData(await knowledgeApi.pages(sourceId)); setError(null); } catch (e) { setError((e as Error).message); }
  }, [sourceId]);
  useEffect(() => { load(); }, [load]);
  const reading = (data?.counts.pending ?? 0) > 0;
  useEffect(() => { if (!reading) return; const i = setInterval(load, 4000); return () => clearInterval(i); }, [reading, load]);

  const items = useMemo(() => (data?.items ?? []).filter((p) => filter === 'all' || !['verified', 'excluded'].includes(p.status)), [data, filter]);

  if (error) return <EmptyState icon={AlertTriangle} title="Couldn’t load Kate’s page readings" description={error} />;
  if (!data) return <LoadingState label="Loading page readings…" />;
  if (data.items.length === 0) return <EmptyState icon={Eye} title="No pictures to read" description="Kate found no images, charts or scanned pages in this source, so all of its text came straight from the file." />;

  const c = data.counts;
  const run = async (key: string, fn: () => Promise<unknown>) => { setBusy(key); try { await fn(); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); } };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
        <p className="text-sm text-slate-700">
          Kate read <b>{data.items.length}</b> page{data.items.length === 1 ? '' : 's'} with pictures using two separate AI readers.
          Compare each reading with the page image. <b>Only pages you verify are used to build lessons.</b>
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(STATUS) as PageReadStatus[]).filter((k) => c[k]).map((k) => <Badge key={k} size="sm" variant={STATUS[k].variant}>{STATUS[k].label}: {c[k]}</Badge>)}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {(c.agreed ?? 0) > 0 && (
              <Button size="sm" variant="secondary" isLoading={busy === 'agreed'} leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => run('agreed', () => knowledgeApi.verifyAgreed(sourceId))}>
                Verify the {c.agreed} page{c.agreed === 1 ? '' : 's'} where both readers agree
              </Button>
            )}
            {data.pendingRebuild > 0 && (
              <Button size="sm" isLoading={busy === 'apply'} leftIcon={<Sparkles className="w-4 h-4" />} onClick={() => run('apply', async () => { await knowledgeApi.applyPages(sourceId); onApplied(); })}>
                Add {data.pendingRebuild} reviewed page{data.pendingRebuild === 1 ? '' : 's'} to knowledge
              </Button>
            )}
          </div>
        )}
        <div className="flex gap-3 text-xs font-semibold">
          <button className={filter === 'todo' ? 'text-indigo-700' : 'text-slate-500'} onClick={() => setFilter('todo')}>Still to review</button>
          <button className={filter === 'all' ? 'text-indigo-700' : 'text-slate-500'} onClick={() => setFilter('all')}>All pages</button>
        </div>
      </section>

      {items.length === 0 && <EmptyState icon={CheckCircle2} title="All pages reviewed" description={data.pendingRebuild > 0 ? 'Click “Add reviewed pages to knowledge” so Kate can use them.' : 'Everything you verified is already part of this source’s knowledge.'} />}
      <ul className="space-y-4">
        {items.map((p) => <PageCard key={p.id} page={p} canEdit={canEdit} busy={busy === `p${p.page_number}`}
          onAction={(action, finalText) => run(`p${p.page_number}`, () => knowledgeApi.reviewPage(sourceId, p.page_number, { action, finalText }))} />)}
      </ul>
    </div>
  );
};

const PageCard: React.FC<{ page: PageRead; canEdit: boolean; busy: boolean; onAction: (a: 'verify' | 'exclude' | 'reopen', text?: string) => void }> = ({ page: p, canEdit, busy, onAction }) => {
  const [text, setText] = useState(p.final_text ?? '');
  const [showCheck, setShowCheck] = useState(false);
  useEffect(() => setText(p.final_text ?? ''), [p.final_text]);
  const done = p.status === 'verified' || p.status === 'excluded';
  const uncertain = [...(p.primary_result?.uncertain ?? []), ...(p.check_result?.uncertain ?? [])];

  return (
    <li className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3" data-page={p.page_number}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-slate-900">Page {p.page_number}</p>
        <span className="text-xs text-slate-500">{REASON[p.reason] ?? p.reason}</span>
        <Badge size="sm" variant={STATUS[p.status].variant}>{STATUS[p.status].label}</Badge>
        {p.agreement !== null && <span className="text-xs text-slate-500">readers matched {Math.round(p.agreement * 100)}%</span>}
        {p.included_in_knowledge && <Badge size="sm" variant="emerald">In knowledge</Badge>}
      </div>
      {p.status === 'pending' ? <p className="text-xs text-slate-500">Kate is reading this page…</p> : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            {p.image_url ? <a href={p.image_url} target="_blank" rel="noreferrer"><img src={p.image_url} alt={`Page ${p.page_number}`} className="w-full h-auto" loading="lazy" /></a>
              : <p className="p-4 text-xs text-slate-500">Page image unavailable.</p>}
          </div>
          <div className="space-y-2">
            {p.error && <p className="text-xs text-rose-700 bg-rose-50 rounded-lg p-2">{p.error}</p>}
            {(p.differences.length > 0 || uncertain.length > 0) && (
              <div className="text-xs bg-amber-50 text-amber-900 rounded-lg p-2 space-y-1">
                {p.differences.length > 0 && <p><b>Readers disagreed on:</b> {p.differences.slice(0, 20).join(', ')}</p>}
                {uncertain.length > 0 && <p><b>Unsure about:</b> {[...new Set(uncertain)].slice(0, 20).join(', ')}</p>}
              </div>
            )}
            <label className="block text-xs font-semibold text-slate-600">What this page says (edit anything that’s wrong)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!canEdit || done} rows={12}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono leading-relaxed disabled:bg-slate-50" />
            {p.check_result && (
              <button className="text-xs font-semibold text-indigo-700" onClick={() => setShowCheck((v) => !v)}>{showCheck ? 'Hide' : 'Show'} second reader’s version</button>
            )}
            {showCheck && p.check_result && <pre className="whitespace-pre-wrap text-xs bg-slate-50 rounded-lg p-2 max-h-64 overflow-auto">{p.check_result.text}</pre>}
            {canEdit && (
              <div className="flex flex-wrap gap-2 pt-1">
                {!done && <Button size="sm" isLoading={busy} leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => onAction('verify', text)} disabled={!text.trim()}>Verify page</Button>}
                {!done && <Button size="sm" variant="ghost" leftIcon={<EyeOff className="w-4 h-4" />} onClick={() => onAction('exclude')}>Exclude</Button>}
                {done && <Button size="sm" variant="secondary" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={() => onAction('reopen')}>Review again</Button>}
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
};
