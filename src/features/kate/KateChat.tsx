import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Sparkles, X, FileText, MapPin, RotateCw, Loader2 } from 'lucide-react';
import type { KateMessageView, ChangeSetView } from '../../../shared/kate/types';
import type { PlacementTarget } from '../../../shared/classroom/types';
import { createThread, getThread, sendMessage, getChecklist, getChangeSet } from './api';
import { ChangeSetCard } from './ChangeSetCard';
import { ChecklistCard } from './ChecklistCard';
import { PlacementPicker } from './placement';
import { Markdown } from '../classroom/ItemRenderers';
import { apiFetch } from '../../services/api/client';

export interface KateContext { courseId?: string; moduleId?: string; lessonId?: string; sourceIds?: string[] }
interface Source { id: string; title: string; processing_state: string }

const THREAD_KEY = 'vcu.kate.threadId';
const STARTERS = ['What can you do with my latest upload?', 'Make a quiz for Module 1 from my sources', 'Rewrite this lesson for clarity using only my sources'];

const ChangeSetLoader: React.FC<{ id: string }> = ({ id }) => {
  const [cs, setCs] = useState<ChangeSetView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { getChangeSet(id).then(setCs).catch((e) => setErr(e?.message ?? 'Could not load')); }, [id]);
  if (err) return <div className="text-xs text-rose-600">{err}</div>;
  if (!cs) return <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" />Loading preview...</div>;
  return <ChangeSetCard changeSet={cs} onApplied={() => window.dispatchEvent(new CustomEvent('classroom:refresh'))} onReverted={() => window.dispatchEvent(new CustomEvent('classroom:refresh'))} />;
};

export const KateChat: React.FC<{ initialContext?: KateContext; initialPrompt?: string; checklistFor?: string[]; threadId?: string | null; onThread?: (id: string) => void }> = ({ initialContext, initialPrompt, checklistFor, threadId: forcedThread, onThread }) => {
  const [threadId, setThreadId] = useState<string | null>(forcedThread ?? localStorage.getItem(THREAD_KEY));
  const [messages, setMessages] = useState<KateMessageView[]>([]);
  const [draft, setDraft] = useState(initialPrompt ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<KateContext>(initialContext ?? {});
  const [sources, setSources] = useState<Source[]>([]);
  const [placeFor, setPlaceFor] = useState<KateMessageView | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const ranChecklist = useRef<string>('');

  useEffect(() => { setCtx((c) => ({ ...c, ...(initialContext ?? {}) })); }, [JSON.stringify(initialContext)]);
  useEffect(() => { if (initialPrompt) setDraft(initialPrompt); }, [initialPrompt]);
  useEffect(() => { if (forcedThread !== undefined) setThreadId(forcedThread); }, [forcedThread]);
  useEffect(() => { apiFetch<{ sources: Source[] }>('/knowledge/sources?state=ready&limit=100').then((r) => setSources(r.sources ?? [])).catch(() => {}); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const ensureThread = useCallback(async () => {
    if (threadId) return threadId;
    const { thread } = await createThread({ courseId: ctx.courseId } as any);
    localStorage.setItem(THREAD_KEY, thread.id); setThreadId(thread.id); onThread?.(thread.id);
    return thread.id;
  }, [threadId, ctx.courseId, onThread]);

  useEffect(() => {
    if (!threadId) { setMessages([]); return; }
    getThread(threadId).then((r) => setMessages(r.messages)).catch(() => { localStorage.removeItem(THREAD_KEY); setThreadId(null); });
  }, [threadId]);

  const runChecklist = useCallback(async (ids: string[]) => {
    setBusy('Kate is reading your whole upload...'); setError(null);
    try {
      const t = await ensureThread();
      await getChecklist({ sourceIds: ids, threadId: t });
      setMessages((await getThread(t)).messages);
    } catch (e: any) { setError(e?.message ?? 'Kate could not read that source'); }
    finally { setBusy(null); }
  }, [ensureThread]);

  useEffect(() => {
    const key = (checklistFor ?? []).join(',');
    if (key && ranChecklist.current !== key) { ranChecklist.current = key; setCtx((c) => ({ ...c, sourceIds: checklistFor })); void runChecklist(checklistFor!); }
  }, [checklistFor, runChecklist]);

  const send = async (text: string, extra?: Record<string, unknown>) => {
    const content = text.trim(); if (!content || busy) return;
    setBusy('Kate is thinking...'); setError(null);
    const optimistic: KateMessageView = { id: 'tmp', role: 'user', content, createdAt: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]); setDraft('');
    try {
      const t = await ensureThread();
      const r = await sendMessage(t, { content, context: { ...ctx, ...(extra ?? {}) } as any });
      setMessages((m) => [...m.filter((x) => x.id !== 'tmp'), ...r.messages]);
    } catch (e: any) {
      setMessages((m) => m.filter((x) => x.id !== 'tmp')); setDraft(content);
      setError(e?.message ?? 'Kate could not answer');
    } finally { setBusy(null); }
  };

  const placed = (t: PlacementTarget) => {
    const msg = placeFor; setPlaceFor(null);
    const where = [t.courseId && 'course ' + t.courseId, t.moduleId === 'new' ? `a new module "${t.newModuleTitle ?? ''}"` : `module ${t.moduleId}`, t.lessonId === 'new' ? `a new lesson "${t.newLessonTitle ?? ''}"` : `lesson ${t.lessonId}`].join(', ');
    void send(`Put the ${msg?.placementRequest?.forAction ?? 'material'} here: ${where} (${t.kind}, ${t.slot}).`, { placement: t, courseId: t.courseId });
  };

  const srcTitle = (id: string) => sources.find((s) => s.id === id)?.title ?? 'Source';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2">
        {(ctx.sourceIds ?? []).map((id) => <span key={id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"><FileText className="h-3 w-3" />{srcTitle(id)}<button aria-label="Remove source" onClick={() => setCtx((c) => ({ ...c, sourceIds: c.sourceIds?.filter((x) => x !== id) }))}><X className="h-3 w-3" /></button></span>)}
        {ctx.lessonId && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"><MapPin className="h-3 w-3" />This lesson<button aria-label="Remove" onClick={() => setCtx((c) => ({ ...c, lessonId: undefined }))}><X className="h-3 w-3" /></button></span>}
        <select value="" onChange={(e) => e.target.value && setCtx((c) => ({ ...c, sourceIds: [...new Set([...(c.sourceIds ?? []), e.target.value])] }))} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
          <option value="">+ Use a source</option>
          {sources.filter((s) => !(ctx.sourceIds ?? []).includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        {(ctx.sourceIds ?? []).length > 0 && <button onClick={() => runChecklist(ctx.sourceIds!)} disabled={!!busy} className="ml-auto text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50">What can you make from these?</button>}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !busy && (
          <div className="space-y-3 pt-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-indigo-500" />
            <p className="text-sm text-slate-600">Hi, I'm Kate. I build lessons, quizzes and flashcards from <b>your</b> uploads only, and I always show you a preview before anything goes into the Classroom.</p>
            <div className="flex flex-col gap-2">{STARTERS.map((s) => <button key={s} onClick={() => setDraft(s)} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">{s}</button>)}</div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'space-y-3'}>
            {m.role === 'user'
              ? <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white">{m.content}</div>
              : <>
                  <div className="max-w-[95%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800"><Markdown md={m.content} /></div>
                  {m.checklist && <ChecklistCard checklist={m.checklist} threadId={threadId ?? undefined} courseId={ctx.courseId} onGenerated={() => threadId && getThread(threadId).then((r) => setMessages(r.messages))} />}
                  {m.changeSetId && <ChangeSetLoader id={m.changeSetId} />}
                  {m.placementRequest && !m.changeSetId && <button onClick={() => setPlaceFor(m)} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"><MapPin className="h-4 w-4" />Where should this go?</button>}
                </>}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{busy}{busy.includes('reading') && <span className="text-xs">(up to a minute)</span>}</div>}
        {error && <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}<button onClick={() => void send(draft)} className="ml-auto inline-flex items-center gap-1 font-medium"><RotateCw className="h-3 w-3" />Retry</button></div>}
        <div ref={bottom} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(draft); }} className="flex items-end gap-2 border-t border-slate-100 p-3">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft); } }} rows={2} placeholder="Ask Kate to build or change something..." className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none" />
        <button type="submit" disabled={!draft.trim() || !!busy} className="rounded-xl bg-indigo-600 p-2.5 text-white disabled:opacity-40 hover:bg-indigo-700" aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>

      <PlacementPicker isOpen={!!placeFor} onClose={() => setPlaceFor(null)} title="Where should this go?" defaultTarget={{ ...(placeFor?.placementRequest?.suggestion ?? {}), courseId: placeFor?.placementRequest?.suggestion?.courseId ?? ctx.courseId }} onConfirm={placed} />
    </div>
  );
};
