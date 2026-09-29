import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, FileText, Download, ExternalLink, RotateCcw, ChevronLeft, ChevronRight, Music } from 'lucide-react';
import type { LessonItem, ItemPayload } from '../../../shared/classroom/types';
import { renderMarkdown } from './markdown';
import { attemptQuizItem, type QuizAttemptResult } from './api';

const ytId = (p: any): string | null => {
  if (p.youtubeId) return p.youtubeId;
  const m = String(p.url ?? '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

export const Markdown: React.FC<{ md: string }> = ({ md }) => {
  const html = useMemo(() => renderMarkdown(md), [md]);
  return <div className="text-slate-700 text-[15px] max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
};

const Transcript: React.FC<{ text?: string }> = ({ text }) => text ? (
  <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
    <summary className="cursor-pointer font-medium text-slate-700">Transcript</summary>
    <div className="mt-2 whitespace-pre-wrap text-slate-600">{text}</div>
  </details>
) : null;

function VideoItem({ p }: { p: any }) {
  const id = ytId(p);
  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-900" style={{ paddingTop: '56.25%' }}>
        {id
          ? <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`} title="Lesson video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          : <video className="absolute inset-0 h-full w-full" src={p.url} controls preload="metadata" />}
      </div>
      <Transcript text={p.transcript} />
    </div>
  );
}

function QuizItem({ item, localMode }: { item: LessonItem; localMode: boolean }) {
  const p = item.payload as Extract<ItemPayload, { kind: 'quiz' }>;
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toggle = (qid: string, oid: string, multi: boolean) => setAnswers((a) => {
    const cur = a[qid] ?? [];
    return { ...a, [qid]: multi ? (cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid]) : [oid] };
  });
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (localMode) {
        const results = p.questions.map((q) => { const g = [...(answers[q.id] ?? [])].sort(); const r = [...(q.correctOptionIds ?? [])].sort(); return { questionId: q.id, correct: g.length === r.length && g.every((x, i) => x === r[i]), correctOptionIds: r, explanation: q.explanation ?? null }; });
        const scorePercent = Math.round((results.filter((r) => r.correct).length / Math.max(1, results.length)) * 100);
        setResult({ scorePercent, passed: scorePercent >= (p.passingScorePercent ?? 70), results } as any);
      } else setResult(await attemptQuizItem(item.id, answers));
    } catch (e: any) { setErr(e?.message ?? 'Could not submit. Please sign in and try again.'); }
    finally { setBusy(false); }
  };
  const byQ = new Map((result?.results ?? []).map((r: any) => [r.questionId, r]));
  const answered = p.questions.filter((q) => (answers[q.id] ?? []).length).length;
  return (
    <div className="space-y-4">
      {result && (
        <div className={`rounded-xl p-4 border ${result.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="text-lg font-bold">{result.scorePercent}% {result.passed ? 'Passed' : 'Not yet'}</div>
          <div className="text-sm">You need {p.passingScorePercent ?? 70}% to pass.</div>
        </div>
      )}
      {p.questions.map((q, qi) => {
        const multi = q.type === 'multiple'; const r: any = byQ.get(q.id);
        return (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-start gap-2 font-medium text-slate-800">
              <span className="text-slate-400">{qi + 1}.</span><span className="flex-1">{q.prompt}{multi && <span className="ml-2 text-xs font-normal text-slate-500">(choose all that apply)</span>}</span>
              {r && (r.correct ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-500" />)}
            </div>
            <div className="space-y-2">
              {q.options.map((o) => {
                const chosen = (answers[q.id] ?? []).includes(o.id);
                const isRight = r?.correctOptionIds?.includes(o.id);
                return (
                  <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${r ? (isRight ? 'border-emerald-300 bg-emerald-50' : chosen ? 'border-rose-300 bg-rose-50' : 'border-slate-200') : chosen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type={multi ? 'checkbox' : 'radio'} name={q.id} checked={chosen} disabled={!!result} onChange={() => toggle(q.id, o.id, multi)} className="accent-indigo-600" />
                    <span>{o.text}</span>
                  </label>
                );
              })}
            </div>
            {r?.explanation && <p className="mt-3 text-sm text-slate-600"><span className="font-medium">Why: </span>{r.explanation}</p>}
          </div>
        );
      })}
      {err && <p className="text-sm text-rose-600">{err}</p>}
      {result
        ? <button onClick={() => { setResult(null); setAnswers({}); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Try again</button>
        : <button onClick={submit} disabled={busy || answered < p.questions.length} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700">{busy ? 'Checking...' : `Submit answers (${answered}/${p.questions.length})`}</button>}
    </div>
  );
}

function Flashcards({ p }: { p: any }) {
  const cards: { front: string; back: string }[] = p.cards ?? [];
  const [i, setI] = useState(0); const [flip, setFlip] = useState(false);
  if (!cards.length) return null;
  const go = (d: number) => { setFlip(false); setI((x) => (x + d + cards.length) % cards.length); };
  return (
    <div className="flex flex-col items-center gap-3" tabIndex={0} onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === ' ') { e.preventDefault(); setFlip((f) => !f); } }}>
      <button onClick={() => setFlip((f) => !f)} className={`flex min-h-44 w-full max-w-lg items-center justify-center rounded-2xl border p-6 text-center text-lg shadow-sm transition ${flip ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-800'}`}>
        {flip ? cards[i].back : cards[i].front}
      </button>
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <button onClick={() => go(-1)} className="rounded-full p-1 hover:bg-slate-100" aria-label="Previous card"><ChevronLeft className="h-5 w-5" /></button>
        <span>Card {i + 1} of {cards.length} · tap to flip</span>
        <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-slate-100" aria-label="Next card"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

export const ItemView: React.FC<{ item: LessonItem; localMode: boolean }> = ({ item, localMode }) => {
  const p: any = item.payload;
  switch (item.kind) {
    case 'video': return <VideoItem p={p} />;
    case 'audio': return (<div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><Music className="h-4 w-4" />Audio</div><audio src={p.url} controls className="w-full" preload="metadata" /><Transcript text={p.transcript} /></div>);
    case 'pdf': return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3"><FileText className="h-5 w-5 text-rose-500" /><span className="font-medium text-slate-800">{p.fileName || item.title || 'PDF'}</span>
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"><ExternalLink className="h-4 w-4" />Open</a>
          <a href={p.url} download className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"><Download className="h-4 w-4" />Download</a></div>
        {/^https?:/.test(p.url) && <iframe src={p.url} title={item.title ?? 'PDF'} className="h-[70vh] w-full rounded-lg border border-slate-100" />}
      </div>);
    case 'reading': case 'worksheet': case 'lesson_plan': return <Markdown md={p.markdown ?? ''} />;
    case 'image': return (<figure><img src={p.url} alt={p.alt ?? ''} className="w-full rounded-xl border border-slate-200" loading="lazy" />{p.caption && <figcaption className="mt-2 text-center text-sm text-slate-500">{p.caption}</figcaption>}</figure>);
    case 'quiz': return <QuizItem item={item} localMode={localMode} />;
    case 'flashcards': return <Flashcards p={p} />;
    case 'resource': return (<a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50"><Download className="h-4 w-4 text-indigo-600" /><span className="font-medium text-slate-800">{item.title || p.url}</span>{p.size && <span className="text-slate-400">{p.size}</span>}</a>);
    default: return null;
  }
};
