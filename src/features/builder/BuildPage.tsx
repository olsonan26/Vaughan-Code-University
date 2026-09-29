import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AlertTriangle, ArrowDown, ArrowUp, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight, Combine, Eye, EyeOff, FileSearch, Layers, Loader2, RefreshCw, Scissors, ShieldCheck, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Markdown } from '../classroom/ItemRenderers';
import { bp, builderApi, STATUS_LABEL, type Blueprint, type Build, type BuildLesson } from './api';

const ACTIVE = ['outlining', 'writing', 'assembling'];
const STEPS = [
  { id: 'read', label: 'Read source' }, { id: 'outline', label: 'Approve outline' }, { id: 'write', label: 'Write & fact-check' }, { id: 'review', label: 'Review' }, { id: 'live', label: 'In Classroom' },
];
const stepIndex = (s: Build['status']) => ({ outlining: 0, awaiting_approval: 1, writing: 2, assembling: 2, ready: 3, failed: 3, applied: 4, cancelled: 0 } as const)[s];

const Stepper: React.FC<{ status: Build['status'] }> = ({ status }) => {
  const at = stepIndex(status);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < at || (i === at && status === 'applied') ? 'bg-emerald-500 text-white' : i === at ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i < at || (i === at && status === 'applied') ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
          <span className={`text-sm ${i === at ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{s.label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300" />}
        </li>
      ))}
    </ol>
  );
};

const Bar: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.max(3, Math.min(100, value))}%` }} /></div>
);

const Btn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'ghost' | 'danger' }> = ({ tone = 'ghost', className = '', ...p }) => (
  <button {...p} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${tone === 'primary' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : tone === 'danger' ? 'text-rose-600 hover:bg-rose-50' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} ${className}`} />
);
const IconBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({ label, children, ...p }) => (
  <button {...p} title={label} aria-label={label} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30">{children}</button>
);

// ---------------- Outline review ----------------
const OutlineEditor: React.FC<{ build: Build; onApproved: () => void }> = ({ build, onApproved }) => {
  const [b, setB] = useState<Blueprint>(() => bp.clone(build.blueprint!));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const orig = build.blueprint!;
  const covered = bp.covered(b);
  const teachable = orig.stats.passages - orig.stats.skipped;
  const dropped = Math.max(0, bp.covered(orig) - covered);
  const edit = (fn: (n: Blueprint) => void) => setB((cur) => { const n = bp.clone(cur); fn(n); return n; });

  const approve = async () => {
    if (dropped && !window.confirm(`${dropped} passage(s) of your source are no longer in any lesson and will not be taught. Continue?`)) return;
    setSaving(true); setErr(null);
    try { await builderApi.approve(build.id, b); onApproved(); } catch (e: any) { setErr(e.message); setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-[260px] flex-1 space-y-3">
            <label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Course title</span>
              <input value={b.courseTitle} onChange={(e) => edit((n) => { n.courseTitle = e.target.value; })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-bold text-slate-900" /></label>
            <label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>
              <textarea value={b.description} onChange={(e) => edit((n) => { n.description = e.target.value; })} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            {!!b.outcomes.length && <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Students will be able to</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">{b.outcomes.map((o, i) => <li key={i}>{o}</li>)}</ul></div>}
          </div>
          <div className="w-full rounded-lg bg-slate-50 p-4 sm:w-64">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source coverage</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{teachable ? Math.round((covered / teachable) * 100) : 100}%</p>
            <p className="text-xs text-slate-500">{covered} of {teachable} teaching passages are in a lesson.</p>
            <Bar value={teachable ? (covered / teachable) * 100 : 100} />
            <p className="mt-3 text-sm text-slate-700"><b>{b.modules.length}</b> modules · <b>{bp.lessonCount(b)}</b> lessons</p>
            {!!orig.uncovered.length && <button onClick={() => setShowSkipped((v) => !v)} className="mt-2 text-xs font-semibold text-indigo-600">{showSkipped ? 'Hide' : 'Show'} {orig.stats.skipped} skipped passage(s)</button>}
          </div>
        </div>
        {showSkipped && (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {orig.uncovered.map((u, i) => <li key={i} className="rounded-lg bg-slate-50 p-3 text-xs"><span className="font-semibold text-slate-700">Skipped: {u.why}</span><span className="mt-1 block truncate text-slate-500">“{u.preview}…”</span></li>)}
          </ul>
        )}
        {!!b.gaps.length && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Not covered by your source</p>
            <ul className="mt-1 list-disc pl-5">{b.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            <p className="mt-1 text-xs">Kate will not invent these. Upload a source that covers them if you want them taught.</p>
          </div>
        )}
      </section>

      {b.modules.map((m, mi) => (
        <section key={m.key + mi} className="rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Layers className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-400">MODULE {mi + 1}</span>
            <input value={m.title} onChange={(e) => edit((n) => { n.modules[mi].title = e.target.value; })} aria-label={`Module ${mi + 1} title`} className="flex-1 rounded-md border border-transparent px-2 py-1 font-semibold text-slate-900 hover:border-slate-200 focus:border-indigo-300" />
            {mi < b.modules.length - 1 && <IconBtn label="Merge with the next module" onClick={() => setB(bp.mergeModuleWithNext(b, mi))}><Combine className="h-4 w-4" /></IconBtn>}
          </header>
          <ol className="divide-y divide-slate-100">
            {m.lessons.map((l, li) => (
              <li key={l.key + li} className="flex gap-3 px-4 py-3">
                <span className="mt-1.5 w-8 shrink-0 text-xs font-bold text-slate-400">{mi + 1}.{li + 1}</span>
                <div className="min-w-0 flex-1">
                  <input value={l.title} onChange={(e) => edit((n) => { n.modules[mi].lessons[li].title = e.target.value; })} aria-label="Lesson title" className="w-full rounded-md border border-transparent px-2 py-1 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-indigo-300" />
                  <p className="px-2 text-xs leading-relaxed text-slate-600">{l.focus}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1 px-2 text-[11px] text-slate-500">
                    <FileSearch className="h-3 w-3" />{l.pages ?? 'source'} · {l.chunkIds.length} passage(s)
                    {l.keyTerms.slice(0, 6).map((t) => <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{t}</span>)}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-0.5">
                  <IconBtn label="Move up" disabled={mi === 0 && li === 0} onClick={() => setB(bp.moveLesson(b, mi, li, -1))}><ArrowUp className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Move down" disabled={mi === b.modules.length - 1 && li === m.lessons.length - 1} onClick={() => setB(bp.moveLesson(b, mi, li, 1))}><ArrowDown className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Merge with the next lesson" disabled={li === m.lessons.length - 1} onClick={() => setB(bp.mergeWithNext(b, mi, li))}><Combine className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Start a new module here" disabled={li === 0} onClick={() => setB(bp.splitModuleAt(b, mi, li))}><Scissors className="h-4 w-4" /></IconBtn>
                  <IconBtn label="Remove lesson (its pages will not be taught)" onClick={() => setB(bp.removeLesson(b, mi, li))}><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {err && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}
      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <span className="mr-auto text-sm text-slate-600">Kate will write {bp.lessonCount(b)} lessons{build.options.quizzes !== false ? ', each with a quiz' : ''}{build.options.flashcards !== false ? ' and flashcards' : ''}, then fact-check every one.</span>
        <Btn onClick={() => setB(bp.clone(orig))} disabled={saving}>Reset</Btn>
        <Btn tone="primary" onClick={approve} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}Approve outline and write the course</Btn>
      </div>
    </div>
  );
};

// ---------------- Lesson preview ----------------
const statusText: Record<BuildLesson['status'], string> = { queued: 'Waiting', writing: 'Writing the lesson', practice: 'Writing quiz & flashcards', checking: 'Fact-checking', revising: 'Fixing flagged statements', done: 'Done', failed: 'Failed' };

const LessonCard: React.FC<{ n: string; lesson: BuildLesson; canRewrite: boolean; onRewrite: (note: string) => Promise<void> }> = ({ n, lesson, canRewrite, onRewrite }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'lesson' | 'quiz' | 'cards' | 'worksheet'>('lesson');
  const [note, setNote] = useState(''); const [asking, setAsking] = useState(false); const [busy, setBusy] = useState(false);
  const a = lesson.audit; const q = lesson.practice?.questions ?? []; const cards = lesson.practice?.cards ?? [];
  const working = !['done', 'failed', 'queued'].includes(lesson.status);
  return (
    <li className="rounded-xl border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open}>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <span className="w-8 text-xs font-bold text-slate-400">{n}</span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{lesson.title}</span>
        {working ? <span className="flex items-center gap-1.5 text-xs text-indigo-600"><Loader2 className="h-3.5 w-3.5 animate-spin" />{statusText[lesson.status]}</span>
          : lesson.status === 'failed' ? <span className="flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="h-3.5 w-3.5" />Failed</span>
          : lesson.status === 'queued' ? <span className="text-xs text-slate-400">Waiting</span>
          : a?.passed ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" />Fact-checked{a.revised ? ' (auto-corrected)' : ''}</span>
          : <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />{a?.unsupportedClaims.length ?? 0} to review</span>}
        {lesson.status === 'done' && <span className="hidden text-xs text-slate-400 sm:inline">{q.length} questions · {cards.length} cards</span>}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {lesson.error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{lesson.error}</p>}
          {a && !a.passed && !!a.unsupportedClaims.length && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">The fact-checker could not find these in your source:</p>
              <ul className="mt-1 list-disc pl-5">{a.unsupportedClaims.map((c, i) => <li key={i}><span className="font-medium">“{c.text}”</span> <span className="text-amber-700">({c.reason})</span></li>)}</ul>
              <p className="mt-1 text-xs">Rewrite the lesson with a note, or add it anyway after checking these yourself.</p>
            </div>
          )}
          {lesson.status === 'done' && (
            <>
              <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-100">
                {([['lesson', 'Lesson'], ['quiz', `Quiz (${q.length})`], ['cards', `Flashcards (${cards.length})`], ...(lesson.practice?.worksheet ? [['worksheet', 'Worksheet']] : [])] as [typeof tab, string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${tab === id ? 'border-indigo-600 font-semibold text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>
                ))}
              </div>
              {tab === 'lesson' && <div className="max-h-[70vh] overflow-y-auto pr-2"><Markdown md={lesson.reading?.markdown ?? ''} /></div>}
              {tab === 'quiz' && (
                <ol className="space-y-4">
                  {q.map((x, i) => (
                    <li key={x.id} className="text-sm">
                      <p className="font-semibold text-slate-800">{i + 1}. {x.prompt} <span className="ml-1 text-xs font-normal text-slate-400">{x.type === 'multiple' ? 'choose all that apply' : x.type === 'true_false' ? 'true / false' : ''}</span></p>
                      <ul className="mt-1 space-y-1">{x.options.map((o) => { const ok = x.correctOptionIds.includes(o.id); return <li key={o.id} className={`flex items-start gap-2 rounded-md px-2 py-1 ${ok ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600'}`}>{ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}{o.text}</li>; })}</ul>
                      {x.explanation && <p className="mt-1 text-xs text-slate-500">Why: {x.explanation}</p>}
                    </li>
                  ))}
                </ol>
              )}
              {tab === 'cards' && <ul className="grid gap-2 sm:grid-cols-2">{cards.map((c, i) => <li key={i} className="rounded-lg border border-slate-200 p-3 text-sm"><p className="font-semibold text-slate-800">{c.front}</p><p className="mt-1 text-slate-600">{c.back}</p></li>)}</ul>}
              {tab === 'worksheet' && <Markdown md={lesson.practice?.worksheet ?? ''} />}
              {!!a?.gaps.length && <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Gaps Kate noticed ({a.gaps.length})</summary><ul className="mt-1 list-disc pl-5">{a.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul></details>}
            </>
          )}
          {canRewrite && (lesson.status === 'done' || lesson.status === 'failed') && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              {!asking ? <Btn onClick={() => setAsking(true)}><RefreshCw className="h-4 w-4" />Rewrite this lesson</Btn> : (
                <div className="space-y-2">
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="What should Kate change? e.g. Explain the worked example more slowly. Add more calculation questions." />
                  <div className="flex gap-2"><Btn tone="primary" disabled={busy} onClick={async () => { setBusy(true); try { await onRewrite(note); setAsking(false); setNote(''); } finally { setBusy(false); } }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Rewrite</Btn><Btn onClick={() => setAsking(false)}>Cancel</Btn></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
};

// ---------------- Page ----------------
export const BuildPage: React.FC = () => {
  const { buildId } = useParams();
  const [build, setBuild] = useState<Build | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [override, setOverride] = useState(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try { const b = await builderApi.get(buildId!); setBuild(b); setErr(null); return b; } catch (e: any) { setErr(e.message); return null; }
  }, [buildId]);
  useEffect(() => {
    let alive = true;
    const tick = async () => { const b = await load(); if (!alive) return; timer.current = window.setTimeout(tick, b && ACTIVE.includes(b.status) ? 4000 : 20000); };
    tick();
    return () => { alive = false; if (timer.current) window.clearTimeout(timer.current); };
  }, [load]);

  const act = async (name: string, fn: () => Promise<unknown>) => { setBusy(name); setErr(null); try { await fn(); await load(); } catch (e: any) { setErr(e.message); } finally { setBusy(null); } };

  if (!build) return <div className="flex items-center gap-2 p-8 text-sm text-slate-500">{err ? <span className="text-rose-600">{err}</span> : <><Loader2 className="h-4 w-4 animate-spin" />Loading course build…</>}</div>;
  const bpx = build.blueprint;
  const lessonsDone = build.lessons.filter((l) => l.status === 'done').length;
  const flagged = build.lessons.filter((l) => l.audit && !l.audit.passed);
  const title = bpx?.courseTitle || build.newCourse?.title || 'New course';
  const byKey = new Map(build.lessons.map((l) => [l.key, l]));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={title} description={STATUS_LABEL[build.status]} breadcrumbs={[{ label: 'My Courses', to: '/instructor/courses' }, { label: title }]}
        actions={ACTIVE.includes(build.status) || build.status === 'awaiting_approval' ? <Btn tone="danger" disabled={!!busy} onClick={() => window.confirm('Stop building this course?') && act('cancel', () => builderApi.cancel(build.id))}>Cancel build</Btn> : undefined} />
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><Stepper status={build.status} /></div>
      {(err || build.error) && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err || build.error}</div>}

      {build.status === 'outlining' && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-indigo-500" />
          <p className="text-base font-semibold text-slate-900">Kate is reading every page of your source</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">She's dividing it into lessons in the source's own order and making sure no passage is left out. This usually takes a minute or two. You can leave this page; it keeps going.</p>
          <div className="mx-auto mt-4 max-w-md"><Bar value={build.job?.progress ?? 5} /><p className="mt-1 text-xs text-slate-400">{build.job?.stage ?? 'Starting'}</p></div>
        </section>
      )}

      {build.status === 'awaiting_approval' && bpx && <OutlineEditor build={build} onApproved={load} />}

      {['writing', 'assembling', 'ready', 'failed', 'applied'].includes(build.status) && bpx && (
        <>
          {(build.status === 'writing' || build.status === 'assembling') && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-900">{build.status === 'assembling' ? 'Putting the course together…' : `Writing lessons: ${lessonsDone} of ${build.lessons.length} done`}</span><span className="text-slate-500">You can open finished lessons below while Kate works.</span></div>
              <Bar value={build.lessons.length ? (lessonsDone / build.lessons.length) * 100 : 0} />
            </section>
          )}
          {build.status === 'ready' && (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="flex items-center gap-2 text-base font-semibold text-emerald-900"><CheckCircle2 className="h-5 w-5" />Your course is written: {bpx.modules.length} modules, {build.lessons.length} lessons.</p>
              <p className="mt-1 text-sm text-emerald-800">{flagged.length ? `${flagged.length} lesson(s) have statements the fact-checker could not find in your source. Open them below and rewrite, or check them yourself.` : 'Every lesson passed the source fact-check.'} Adding it creates everything in the Classroom as a hidden draft, so students won't see it until you publish.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {!!flagged.length && <label className="flex items-center gap-2 text-sm text-emerald-900"><input type="checkbox" className="accent-emerald-600" checked={override} onChange={(e) => setOverride(e.target.checked)} />I reviewed the flagged statements</label>}
                <Btn tone="primary" disabled={!!busy || (!!flagged.length && !override)} onClick={() => act('apply', () => builderApi.apply(build.id, override))}>{busy === 'apply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Add course to the Classroom</Btn>
              </div>
            </section>
          )}
          {build.status === 'applied' && build.course && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="flex items-center gap-2 text-base font-semibold text-slate-900"><CheckCircle2 className="h-5 w-5 text-emerald-500" />“{build.course.title}” is in the Classroom.</p>
              <p className="mt-1 text-sm text-slate-600">{build.course.classroom_visible ? 'Students can see it now.' : 'It is a hidden draft. Preview it, then show it to students when you are happy.'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/classroom" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" />Open the Classroom</Link>
                {build.course.classroom_visible
                  ? <Btn disabled={!!busy} onClick={() => act('publish', () => builderApi.publish(build.id, false))}><EyeOff className="h-4 w-4" />Hide from students</Btn>
                  : <Btn tone="primary" disabled={!!busy} onClick={() => act('publish', () => builderApi.publish(build.id, true))}><Eye className="h-4 w-4" />Show to students</Btn>}
              </div>
            </section>
          )}
          {bpx.modules.map((m, mi) => (
            <section key={m.key}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><Layers className="h-4 w-4 text-indigo-500" />Module {mi + 1}: {m.title}</h3>
              <ul className="space-y-2">
                {m.lessons.map((l, li) => { const row = byKey.get(l.key); return row ? <LessonCard key={l.key} n={`${mi + 1}.${li + 1}`} lesson={row} canRewrite={['ready', 'failed'].includes(build.status)} onRewrite={(note) => act('rewrite', () => builderApi.rewrite(build.id, l.key, note))} /> : null; })}
              </ul>
            </section>
          ))}
        </>
      )}
      {build.status === 'cancelled' && <p className="text-sm text-slate-500">This build was cancelled. <Link to="/instructor/courses/new" className="font-semibold text-indigo-600">Start a new one</Link>.</p>}
    </div>
  );
};

export default BuildPage;
