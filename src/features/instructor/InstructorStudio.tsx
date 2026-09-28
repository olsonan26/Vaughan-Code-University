import { JobsPage } from '../jobs/JobsPage';
import { JobDetailPage } from '../jobs/JobDetailPage';
import React, { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import {
  Activity, ArrowLeft, BookOpen, FolderOpen, Gauge, HeartPulse, KeyRound, LayoutDashboard, Menu, ScrollText, ShieldCheck, Users, X,
} from 'lucide-react';
import type { Permission } from '../../../shared/auth/permissions';
import { useStudioPermissions } from './permissions';
import { StudioDashboard } from './dashboard/StudioDashboard';
import { CourseLayout } from './course/CourseLayout';
import { ComingNext } from './common/ComingNext';
import { EmptyState } from '../../components/shared/EmptyState';

interface NavItem { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean; permission?: Permission }

const STUDIO_NAV: NavItem[] = [
  { to: '/instructor', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/instructor/knowledge', label: 'Knowledge Vault', icon: FolderOpen },
  { to: '/instructor/courses', label: 'My Courses', icon: BookOpen },
  { to: '/instructor/jobs', label: 'Generation Jobs', icon: Activity },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/instructor/admin/users', label: 'Users & Roles', icon: Users, permission: 'admin.users' },
  { to: '/instructor/admin/ai', label: 'AI Configuration', icon: KeyRound, permission: 'ai.configure' },
  { to: '/instructor/admin/knowledge', label: 'Knowledge Authority', icon: ShieldCheck, permission: 'knowledge.set_authority' },
  { to: '/instructor/admin/health', label: 'System Health', icon: HeartPulse, permission: 'admin.jobs' },
  { to: '/instructor/admin/activity', label: 'Activity Log', icon: ScrollText, permission: 'admin.audit_log' },
];

const NavGroup: React.FC<{ title: string; items: NavItem[]; onNavigate: () => void }> = ({ title, items, onNavigate }) => (
  <div>
    <p className="px-3 mb-1 text-[10px] font-bold tracking-widest text-slate-400">{title}</p>
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Protected Instructor Studio workspace (/instructor/*).
 * Rendered only behind the Studio permission guard in App.tsx; the server enforces every action.
 */
export const InstructorStudio: React.FC = () => {
  const { can } = useStudioPermissions();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const adminItems = ADMIN_NAV.filter((i) => !i.permission || can(i.permission));

  const sidebar = (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-3">
        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Gauge className="w-4 h-4" /></div>
        <div>
          <p className="text-xs font-black text-slate-900 leading-tight">AI Course Studio</p>
          <p className="text-[10px] text-slate-500">Vaughan Code University</p>
        </div>
      </div>
      <NavGroup title="STUDIO" items={STUDIO_NAV} onNavigate={() => setDrawerOpen(false)} />
      {adminItems.length > 0 && <NavGroup title="ADMIN" items={adminItems} onNavigate={() => setDrawerOpen(false)} />}
      <Link to="/community" className="flex items-center gap-2 px-3 text-xs font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Back to University
      </Link>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)]" id="instructor-studio">
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-200 bg-white">{sidebar}</aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Studio navigation">
          <button className="absolute inset-0 bg-slate-900/40" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl overflow-y-auto">
            <button className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-slate-100" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white">
          <button onClick={() => setDrawerOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Open Studio navigation">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-slate-900">AI Course Studio</span>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Routes>
            <Route index element={<StudioDashboard />} />
            <Route path="knowledge" element={<ComingNext title="Knowledge Vault" description="Upload, process and govern the sources AI is allowed to teach from." milestone="Knowledge Vault" />} />
            <Route path="knowledge/:sourceId" element={<ComingNext title="Source" description="Raw source, extracted text and derived concepts." milestone="Knowledge Vault" />} />
            <Route path="courses" element={<ComingNext title="My Courses" description="Courses you own or collaborate on." milestone="Course Factory" />} />
            <Route path="courses/new" element={<ComingNext title="Create Course" description="Choose knowledge, define students and outcome, set preferences, build the curriculum." milestone="Course Factory" />} />
            <Route path="course/:courseId" element={<CourseLayout />}>
              <Route index element={<ComingNext title="Course overview" description="Status, readiness and recent activity." milestone="Course Factory" />} />
              <Route path="curriculum" element={<ComingNext title="Curriculum blueprint" description="Modules, lessons, objectives and prerequisite checks." milestone="Course Architect" />} />
              <Route path="lesson/:lessonId" element={<ComingNext title="Lesson Studio" description="Edit, regenerate sections and review sources." milestone="Lesson Studio" />} />
              <Route path="visuals" element={<ComingNext title="Visual Production" description="Visual slots, ChatGPT prompts and uploaded imagery." milestone="Visual Director" />} />
              <Route path="quality" element={<ComingNext title="Quality Control" description="Source grounding, prerequisites, coverage and consistency audits." milestone="Quality Engine" />} />
              <Route path="director" element={<ComingNext title="Course Director" description="Ask for course-wide analysis and review proposed changesets." milestone="Course Director" />} />
              <Route path="publish" element={<ComingNext title="Publish" description="Readiness checklist and publishing to the University Classroom." milestone="Publishing" />} />
              <Route path="preview" element={<ComingNext title="Preview as student" description="See the course exactly as students will." milestone="Publishing" />} />
            </Route>
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/:jobId" element={<JobDetailPage />} />
            <Route path="admin/users" element={<ComingNext title="Users & Roles" description="Grant and revoke roles." milestone="Admin" />} />
            <Route path="admin/ai" element={<ComingNext title="AI Configuration" description="Provider, model, tiers and limits. Keys are never shown." milestone="Admin" />} />
            <Route path="admin/knowledge" element={<ComingNext title="Knowledge Authority" description="Canonical sources and locked knowledge." milestone="Admin" />} />
            <Route path="admin/health" element={<ComingNext title="System Health" description="Backend status, failed jobs and AI errors." milestone="Admin" />} />
            <Route path="admin/activity" element={<ComingNext title="Activity Log" description="Audit trail of important actions." milestone="Admin" />} />
            <Route path="*" element={<EmptyState title="Studio page not found" description="Use the Studio navigation to find what you need." />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default InstructorStudio;
