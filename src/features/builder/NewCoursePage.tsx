import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { BookOpen, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { builderApi, STATUS_LABEL, type BuildSummary } from './api';

interface Src { id: string; title: string; processing_state: string; page_count: number | null; chunk_count: number | null; type: string }
const READY = ['ready', 'needs_review'];

const Toggle: React.FC<{ label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }> = ({ label, hint, checked, disabled, onChange }) => (
  <label className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 ${disabled ? 'opacity-80' : 'cursor-pointer hover:border-indigo-300'}`}>
    <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="block text-xs text-slate-500">{hint}</span></span>
  </label>
);

export const NewCoursePage: React.FC = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [sources, setSources] = useState<Src[] | null>(null);
  const [courses, setCourses] = useState<{ id: string; title: string; courseCode: string | null }[]>([]);
  const [picked, setPicked] = useState<string[]>(() => (params.get('source') ? [params.get('source')!] : []));
  const [target, setTarget] = useState<'new' | 'existing'>('new');
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [tier, setTier] = useState<'free' | 'pro' | 'vip'>('pro');
  const [opts, setOpts] = useState({ quizzes: true, flashcards: true, worksheets: false, lockInOrder: true });
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    builderApi.sources().then((r) => setSources((r.items ?? r.sources ?? []) as Src[])).catch((e) => setErr(e.message));
    builderApi.courses().then((r) => setCourses(r.courses ?? [])).catch(() => {});
  }, []);
  const ready = useMemo(() => (sources ?? []).filter((s) => READY.includes(s.processing_state)), [sources]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await builderApi.create({ sourceIds: picked, target, courseId: target === 'existing' ? courseId : undefined, newCourse: { title: title.trim() || undefined, code: code.trim() || undefined, tier }, options: { ...opts, instruction: instruction.trim() || undefined } });
      nav(`/instructor/builds/${r.id}`);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  };
  const canStart = picked.length > 0 && (target === 'new' || courseId) && !busy;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Build a course from your sources" description="Kate reads every page, proposes the modules and lessons in your source's own order, and writes nothing until you approve the outline." breadcrumbs={[{ label: 'My Courses', to: '/instructor/courses' }, { label: 'New course' }]} />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-base font-bold text-slate-900">1. Which sources?</h2>
        <p className="mb-3 text-sm text-slate-500">Pick one or more ready sources. They are taught in the order you pick them.</p>
        {!sources ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your vault…</div>
          : !ready.length ? <p className="text-sm text-slate-600">No ready sources yet. <Link className="font-semibold text-indigo-600" to="/instructor/knowledge">Upload a PDF to your Knowledge Vault</Link> first.</p>
          : <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {ready.map((s) => {
              const n = picked.indexOf(s.id);
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => toggle(s.id)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${n >= 0 ? 'bg-indigo-50/60' : ''}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${n >= 0 ? 'bg-indigo-600 text-white' : 'border border-slate-300 text-transparent'}`}>{n >= 0 ? n + 1 : '·'}</span>
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-sm font-medium text-slate-800">{s.title}</span>
                    <span className="text-xs text-slate-500">{s.page_count ? `${s.page_count} pages · ` : ''}{s.chunk_count ?? 0} passages</span>
                  </button>
                </li>
              );
            })}
          </ul>}
        {sources && sources.some((s) => !READY.includes(s.processing_state) && s.processing_state !== 'failed') && <p className="mt-2 text-xs text-slate-500">Sources still processing will appear here when they are ready.</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">2. Where does it go?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['new', 'existing'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTarget(t)} className={`rounded-lg border p-3 text-left ${target === t ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}>
              <span className="block text-sm font-semibold text-slate-800">{t === 'new' ? 'A brand-new course' : 'Add modules to an existing course'}</span>
              <span className="block text-xs text-slate-500">{t === 'new' ? 'Created hidden from students until you publish it.' : 'New modules are added after the course’s current ones.'}</span>
            </button>
          ))}
        </div>
        {target === 'new' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-3 text-sm"><span className="mb-1 block font-medium text-slate-700">Course title <span className="font-normal text-slate-400">(optional, Kate suggests one from the source)</span></span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. VC 401: The Chart Code" /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Course code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="VC 401" /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Who can take it</span>
              <select value={tier} onChange={(e) => setTier(e.target.value as any)} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="free">Free members</option><option value="pro">Pro members</option><option value="vip">VIP members</option></select></label>
          </div>
        ) : (
          <label className="mt-4 block text-sm"><span className="mb-1 block font-medium text-slate-700">Course</span>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">Choose a course…</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-slate-900">3. What should each lesson include?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Written lesson" hint="Always included: full teaching text with a citation on every paragraph." checked disabled onChange={() => {}} />
          <Toggle label="Quiz" hint="6–10 questions per lesson, answers explained from the source." checked={opts.quizzes} onChange={(v) => setOpts({ ...opts, quizzes: v })} />
          <Toggle label="Flashcards" hint="Key terms, rules and formulas." checked={opts.flashcards} onChange={(v) => setOpts({ ...opts, flashcards: v })} />
          <Toggle label="Practice worksheet" hint="Exercises built only from the source's own examples, with an answer key." checked={opts.worksheets} onChange={(v) => setOpts({ ...opts, worksheets: v })} />
          <Toggle label="Unlock in order" hint="Students must finish each lesson and module before the next opens." checked={opts.lockInOrder} onChange={(v) => setOpts({ ...opts, lockInOrder: v })} />
        </div>
        <label className="mt-4 block text-sm"><span className="mb-1 block font-medium text-slate-700">Anything Kate should know? <span className="font-normal text-slate-400">(optional)</span></span>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} maxLength={4000} className="w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Students are complete beginners. Keep the author's calculation method exactly." /></label>
        <p className="mt-2 text-xs text-slate-500">Kate never adds anything that is not in your sources. Gaps are listed for you instead of filled in.</p>
      </section>

      {err && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{err}</div>}
      <div className="flex justify-end">
        <button disabled={!canStart} onClick={start} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Read my source and propose an outline
        </button>
      </div>
    </div>
  );
};

export const MyCoursesPage: React.FC = () => {
  const [builds, setBuilds] = useState<BuildSummary[] | null>(null);
  const [courses, setCourses] = useState<{ id: string; title: string; courseCode: string | null; classroomVisible?: boolean; modules?: any[] }[]>([]);
  useEffect(() => { builderApi.list().then((r) => setBuilds(r.builds)).catch(() => setBuilds([])); builderApi.courses().then((r) => setCourses(r.courses as any)).catch(() => {}); }, []);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="My Courses" description="Your Classroom courses and the courses Kate is building from your sources." actions={<Link to="/instructor/courses/new" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"><Sparkles className="h-4 w-4" />Build a course from a PDF</Link>} />
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Course builds</h2>
        {!builds ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : !builds.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" /><p className="text-sm text-slate-600">No builds yet. Turn a PDF into a complete course with lessons, quizzes and flashcards.</p><Link to="/instructor/courses/new" className="mt-3 inline-block text-sm font-semibold text-indigo-600">Start your first course build</Link></div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {builds.map((b) => (
              <li key={b.id}><Link to={`/instructor/builds/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                {b.status === 'applied' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : ['outlining', 'writing', 'assembling'].includes(b.status) ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500" /> : <Sparkles className="h-5 w-5 text-indigo-500" />}
                <span className="flex-1"><span className="block text-sm font-semibold text-slate-800">{b.title}</span><span className="block text-xs text-slate-500">{STATUS_LABEL[b.status]}{b.lessons ? ` · ${b.modules} modules, ${b.lessons} lessons` : ''}</span></span>
                <span className="text-xs text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</span>
              </Link></li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Classroom courses</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {courses.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">{c.title}</p>
              <p className="mt-1 text-xs text-slate-500">{c.modules?.length ?? 0} modules · {c.classroomVisible ? 'Visible to students' : 'Hidden draft'}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default NewCoursePage;
