import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock, Eye, EyeOff, GraduationCap, Lock, Plus, Sparkles, Unlock, PlayCircle, FileText, Music, HelpCircle, Layers } from 'lucide-react';
import type { ClassroomCourse, ClassroomLesson, ClassroomModule, LessonItem, LockState } from '../../../shared/classroom/types';
import { ItemView } from './ItemRenderers';
import { completeLesson } from './api';
import { apiFetch } from '../../services/api/client';

type Entity = 'course' | 'module' | 'lesson' | 'lesson_item';
const fire = (name: string, detail: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const kindIcon: Record<string, React.ReactNode> = { video: <PlayCircle className="h-4 w-4" />, audio: <Music className="h-4 w-4" />, pdf: <FileText className="h-4 w-4" />, quiz: <HelpCircle className="h-4 w-4" />, reading: <BookOpen className="h-4 w-4" />, flashcards: <Layers className="h-4 w-4" /> };
const slotOrder = { main: 0, section: 1, resource: 2 } as const;

const LockBadge: React.FC<{ lock: LockState | null; instructor: boolean }> = ({ lock, instructor }) => {
  if (!lock) return null;
  if (lock.locked) return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"><Lock className="h-3 w-3" />{lock.reason || 'Locked'}</span>;
  if (instructor && lock.wouldBlockStudents) return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700" title="Students see this locked"><Lock className="h-3 w-3" />Students: {lock.reason || 'locked'}</span>;
  return null;
};

const Tools: React.FC<{ courseId: string; entityType: Entity; entityId: string; lock: LockState | null; moduleId?: string; lessonId?: string; add?: boolean }> = ({ courseId, entityType, entityId, lock, moduleId, lessonId, add }) => (
  <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
    <button title={lock ? 'Change or remove lock' : 'Lock this'} onClick={() => fire('classroom:edit-lock', { courseId, entityType, entityId, current: lock })} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">{lock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</button>
    {add && <button title="Add material here" onClick={() => fire('classroom:add-material', { courseId, moduleId, lessonId })} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Plus className="h-4 w-4" /></button>}
    <button title="Ask Kate about this" onClick={() => fire('kate:open', { courseId, moduleId, lessonId })} className="rounded-md p-1.5 text-indigo-500 hover:bg-indigo-50"><Sparkles className="h-4 w-4" /></button>
  </span>
);

export const DbClassroom: React.FC<{ courses: ClassroomCourse[]; isInstructor: boolean; localMode: boolean; onRefresh: () => void; onLessonCompleted?: (lesson: ClassroomLesson, course: ClassroomCourse) => void }> = ({ courses, isInstructor, localMode, onRefresh, onLessonCompleted }) => {
  const [courseId, setCourseId] = useState<string | null>(() => new URLSearchParams(location.search).get('course'));
  const [lessonId, setLessonId] = useState<string | null>(() => new URLSearchParams(location.search).get('lesson'));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const course = courses.find((c) => c.id === courseId) ?? null;
  const lessons = useMemo(() => course ? course.modules.flatMap((m) => m.lessons.map((l) => ({ l, m }))) : [], [course]);
  const current = lessons.find((x) => x.l.id === lessonId) ?? null;

  useEffect(() => {
    const u = new URL(location.href);
    courseId ? u.searchParams.set('course', courseId) : u.searchParams.delete('course');
    lessonId ? u.searchParams.set('lesson', lessonId) : u.searchParams.delete('lesson');
    history.replaceState(null, '', u);
  }, [courseId, lessonId]);

  if (!course) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><GraduationCap className="h-7 w-7 text-indigo-600" /><h1 className="text-2xl font-bold text-slate-900">Classroom</h1></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const all = c.modules.flatMap((m) => m.lessons); const done = all.filter((l) => l.completed).length;
            return (
              <button key={c.id} onClick={() => { setCourseId(c.id); setLessonId(null); }} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-md">
                {c.thumbnailUrl && <img src={c.thumbnailUrl} alt="" className="h-40 w-full object-cover" />}
                <div className="space-y-2 p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">{c.courseCode}{c.requiredTier !== 'free' && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">{c.requiredTier}</span>}<LockBadge lock={c.lock} instructor={isInstructor} /></div>
                  <div className="text-lg font-bold text-slate-900 group-hover:text-indigo-700">{c.title}</div>
                  {c.tagline && <p className="line-clamp-2 text-sm text-slate-600">{c.tagline}</p>}
                  <div className="h-1.5 w-full rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} /></div>
                  <div className="text-xs text-slate-500">{done}/{all.length} lessons · {c.modules.length} modules</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const blocked = (m: ClassroomModule, l: ClassroomLesson) => !!(course.lock?.locked || m.lock?.locked || l.lock?.locked);
  const idx = current ? lessons.findIndex((x) => x.l.id === current.l.id) : -1;
  const items = current ? [...current.l.items].sort((a, b) => slotOrder[a.slot] - slotOrder[b.slot] || a.position - b.position) : [];

  const markDone = async () => {
    if (!current) return;
    try { if (!localMode) await completeLesson(current.l.id); onLessonCompleted?.(current.l, course); onRefresh(); }
    catch (e: any) { alert(e?.message ?? 'Could not save your progress'); }
  };
  const togglePublish = async (it: LessonItem) => {
    await apiFetch(`/studio/classroom/items/${it.id}`, { method: 'PATCH', json: { expectedVersion: it.version, published: !it.published } });
    onRefresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-3">
        <button onClick={() => { setCourseId(null); setLessonId(null); }} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />All courses</button>
        <div className="flex items-start justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">{course.title}</h2>{isInstructor && <Tools courseId={course.id} entityType="course" entityId={course.id} lock={course.lock} />}</div>
        <LockBadge lock={course.lock} instructor={isInstructor} />
        <div className="space-y-2">
          {course.modules.map((m) => {
            const isOpen = open[m.id] ?? (current ? current.m.id === m.id : true);
            return (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white">
                <div className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
                  <button onClick={() => setOpen((o) => ({ ...o, [m.id]: !isOpen }))} className="flex flex-1 items-center gap-2 text-sm font-semibold text-slate-800">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{m.title}</button>
                  <LockBadge lock={m.lock} instructor={isInstructor} />
                  {isInstructor && <Tools courseId={course.id} entityType="module" entityId={m.id} lock={m.lock} moduleId={m.id} add />}
                </div>
                {isOpen && (
                  <ul className="border-t border-slate-100 py-1">
                    {m.lessons.map((l) => {
                      const b = blocked(m, l);
                      return (
                        <li key={l.id} className={`flex items-center gap-2 px-3 py-1.5 text-sm ${current?.l.id === l.id ? 'bg-indigo-50' : ''}`}>
                          <button disabled={b && !isInstructor} onClick={() => setLessonId(l.id)} className={`flex flex-1 items-center gap-2 text-left ${b && !isInstructor ? 'cursor-not-allowed text-slate-400' : 'text-slate-700 hover:text-indigo-700'}`}>
                            {l.completed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : b ? <Lock className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />}
                            <span className="flex-1">{l.title}</span>
                          </button>
                          {isInstructor && <Tools courseId={course.id} entityType="lesson" entityId={l.id} lock={l.lock} moduleId={m.id} lessonId={l.id} add />}
                        </li>
                      );
                    })}
                    {isInstructor && <li className="px-3 py-1.5"><button onClick={() => fire('classroom:add-material', { courseId: course.id, moduleId: m.id })} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"><Plus className="h-3 w-3" />Add lesson or material</button></li>}
                  </ul>
                )}
              </div>
            );
          })}
          {isInstructor && <button onClick={() => fire('classroom:add-material', { courseId: course.id })} className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"><Plus className="h-4 w-4" />Add module or material</button>}
        </div>
      </aside>

      <section className="min-w-0">
        {!current ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="text-sm font-semibold uppercase tracking-wide text-indigo-600">{course.courseCode}</div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{course.title}</h1>
            {course.description && <p className="mt-3 whitespace-pre-line text-slate-600">{course.description}</p>}
            {lessons[0] && <button onClick={() => setLessonId(lessons.find((x) => !x.l.completed && !blocked(x.m, x.l))?.l.id ?? lessons[0].l.id)} className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">{lessons.some((x) => x.l.completed) ? 'Continue learning' : 'Start course'}</button>}
          </div>
        ) : blocked(current.m, current.l) && !isInstructor ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Lock className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-800">{current.l.title}</h2>
            <p className="mt-2 text-slate-600">{current.l.lock?.reason || current.m.lock?.reason || course.lock?.reason || 'This lesson is locked for now.'}</p>
          </div>
        ) : (
          <article className="space-y-6">
            <header className="flex flex-wrap items-start gap-3">
              <div className="flex-1">
                <div className="text-sm text-slate-500">{current.m.title}</div>
                <h1 className="text-2xl font-bold text-slate-900">{current.l.title}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">{current.l.durationMinutes ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{current.l.durationMinutes} min</span> : null}{current.l.xpReward ? <span>+{current.l.xpReward} XP</span> : null}<LockBadge lock={current.l.lock} instructor={isInstructor} /></div>
              </div>
              {isInstructor && <Tools courseId={course.id} entityType="lesson" entityId={current.l.id} lock={current.l.lock} moduleId={current.m.id} lessonId={current.l.id} add />}
            </header>
            {current.l.description && <p className="text-slate-600">{current.l.description}</p>}
            {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No content in this lesson yet.{isInstructor && <> <button onClick={() => fire('classroom:add-material', { courseId: course.id, moduleId: current.m.id, lessonId: current.l.id })} className="text-indigo-600 underline">Add material</button> or <button onClick={() => fire('kate:open', { courseId: course.id, moduleId: current.m.id, lessonId: current.l.id })} className="text-indigo-600 underline">ask Kate</button>.</>}</div>}
            {items.map((it) => (
              <div key={it.id} className={`space-y-2 ${!it.published ? 'rounded-xl border border-dashed border-amber-300 p-3' : ''}`}>
                {(it.title && it.kind !== 'reading') || isInstructor ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400">{kindIcon[it.kind]}</span>
                    {it.title && <h3 className="flex-1 font-semibold text-slate-800">{it.title}</h3>}
                    {!it.published && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Hidden from students</span>}
                    {isInstructor && it.provenance === 'ai_with_approved_additions' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Includes approved additions</span>}
                    <LockBadge lock={it.lock} instructor={isInstructor} />
                    {isInstructor && <>
                      <button title={it.published ? 'Hide from students' : 'Show to students'} onClick={() => togglePublish(it)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">{it.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                      <Tools courseId={course.id} entityType="lesson_item" entityId={it.id} lock={it.lock} moduleId={current.m.id} lessonId={current.l.id} />
                    </>}
                  </div>
                ) : null}
                {it.lock?.locked && !isInstructor
                  ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600"><Lock className="mx-auto mb-2 h-6 w-6" />{it.lock.reason}</div>
                  : <ItemView item={it} localMode={localMode} />}
              </div>
            ))}
            <footer className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
              {idx > 0 && <button onClick={() => setLessonId(lessons[idx - 1].l.id)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Previous</button>}
              {current.l.completed ? <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" />Completed</span>
                : <button onClick={markDone} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Mark lesson complete</button>}
              {idx >= 0 && idx < lessons.length - 1 && <button onClick={() => setLessonId(lessons[idx + 1].l.id)} className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Next lesson</button>}
            </footer>
          </article>
        )}
      </section>
    </div>
  );
};
