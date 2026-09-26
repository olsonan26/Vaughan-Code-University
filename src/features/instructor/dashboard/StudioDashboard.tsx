import React from 'react';
import { Link } from 'react-router';
import { BookOpen, FolderOpen, Image as ImageIcon, Plus, Sparkles, Upload, AlertTriangle, Activity } from 'lucide-react';
import { apiFetch, ApiError } from '../../../services/api/client';
import { useApiQuery } from '../../../services/api/hooks';
import type { StudioOverview } from '../../../../shared/studio/overview';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { EmptyState } from '../../../components/shared/EmptyState';
import { ErrorState } from '../../../components/shared/ErrorState';
import { LoadingState } from '../../../components/shared/LoadingState';

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }> = ({ title, icon, children, action }) => (
  <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">{icon}{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

export const StudioDashboard: React.FC = () => {
  const q = useApiQuery<StudioOverview>('studio-overview', (signal) => apiFetch<StudioOverview>('/studio/overview', { signal }));
  const err = q.error;
  const notConnected = err instanceof ApiError && (err.status === 404 || err.status === 503 || err.code === 'network' || err.code === 'not_configured');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-900/60 shadow-lg">
        <p className="text-[11px] font-bold tracking-[0.2em] text-indigo-300">AI COURSE STUDIO</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight max-w-2xl">
          Turn your source material into a complete, source-grounded professional curriculum.
        </h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/instructor/courses/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-indigo-50">
            <Plus className="w-4 h-4" /> Create Course
          </Link>
          <Link to="/instructor/knowledge?upload=1" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/30 text-white text-xs font-bold hover:bg-white/10">
            <Upload className="w-4 h-4" /> Upload Knowledge
          </Link>
        </div>
      </div>

      {q.isLoading && <LoadingState label="Loading your studio..." />}

      {err && (
        <ErrorState
          title={notConnected ? 'The Studio backend is not connected yet' : 'Could not load your studio overview'}
          whatFailed={notConnected
            ? 'The server API or database is not configured for this environment (Supabase and API keys are required).'
            : err.message}
          whatIsSafe="Nothing was changed. Your existing University content is unaffected."
          onRetry={() => q.refetch()}
          retrying={q.isFetching}
        />
      )}

      {q.data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Section title="My Courses" icon={<BookOpen className="w-4 h-4 text-indigo-600" />}
              action={<Link to="/instructor/courses" className="text-xs font-semibold text-indigo-600 hover:underline">View all</Link>}>
              {q.data.courses.length === 0 ? (
                <EmptyState icon={Sparkles} title="Create your first AI-assisted curriculum." action={<Link to="/instructor/courses/new" className="text-xs font-bold text-indigo-600">Create Course</Link>} />
              ) : (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {q.data.courses.map((c) => (
                    <li key={c.id}>
                      <Link to={`/instructor/course/${c.id}`} className="block rounded-xl border border-slate-200 hover:border-indigo-300 overflow-hidden">
                        <div className="h-24 bg-slate-100">{c.coverUrl && <img src={c.coverUrl} alt="" className="w-full h-full object-cover" />}</div>
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900 line-clamp-2">{c.title}</p>
                            <StatusBadge type="course" status={c.status} size="sm" />
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {c.moduleCount} modules • {c.lessonCount} lessons
                            {c.percentComplete !== null && ` • ${Math.round(c.percentComplete)}% written`}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {c.openIssues} open issues • {c.missingVisuals} missing visuals • edited {new Date(c.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Recent Knowledge" icon={<FolderOpen className="w-4 h-4 text-indigo-600" />}
              action={<Link to="/instructor/knowledge" className="text-xs font-semibold text-indigo-600 hover:underline">Knowledge Vault</Link>}>
              {q.data.recentSources.length === 0 ? (
                <EmptyState icon={Upload} title="Upload your first source to begin building the University's AI knowledge base." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {q.data.recentSources.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <Link to={`/instructor/knowledge/${s.id}`} className="text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate">{s.title}</Link>
                      <StatusBadge type="source" status={s.status} size="sm" />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="space-y-5">
            <Section title="Active Jobs" icon={<Activity className="w-4 h-4 text-indigo-600" />}
              action={<Link to="/instructor/jobs" className="text-xs font-semibold text-indigo-600 hover:underline">All jobs</Link>}>
              {q.data.activeJobs.length === 0 ? (
                <p className="text-xs text-slate-500">Nothing is generating right now.</p>
              ) : (
                <ul className="space-y-3">
                  {q.data.activeJobs.map((j) => (
                    <li key={j.id}>
                      <Link to={`/instructor/jobs/${j.id}`} className="block">
                        <div className="flex justify-between text-xs"><span className="font-semibold text-slate-800 truncate">{j.currentStage ?? j.type}</span><span className="text-slate-500">{Math.round(j.progress)}%</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${Math.min(100, j.progress)}%` }} /></div>
                        {j.courseTitle && <p className="text-[11px] text-slate-500 mt-1">{j.courseTitle}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Attention Required" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
              {q.data.attention.length === 0 ? (
                <p className="text-xs text-slate-500">No open issues.</p>
              ) : (
                <ul className="space-y-2">
                  {q.data.attention.map((a) => (
                    <li key={a.kind + a.href}>
                      <Link to={a.href} className="flex items-center justify-between text-xs rounded-lg px-2 py-1.5 hover:bg-amber-50">
                        <span className="text-slate-700">{a.label}</span><span className="font-bold text-amber-700">{a.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Missing Visuals" icon={<ImageIcon className="w-4 h-4 text-indigo-600" />}>
              {q.data.missingVisuals.total === 0 ? (
                <p className="text-xs text-slate-500">No visual slots are waiting for imagery.</p>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-700"><span className="font-bold">{q.data.missingVisuals.total}</span> visual slots need images</p>
                  {q.data.missingVisuals.nextHref && <Link to={q.data.missingVisuals.nextHref} className="text-xs font-bold text-indigo-600">Next missing visual</Link>}
                </div>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioDashboard;
