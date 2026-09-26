import React from 'react';
import { NavLink, Outlet, useParams } from 'react-router';

const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'curriculum', label: 'Curriculum' },
  { to: 'visuals', label: 'Visuals' },
  { to: 'quality', label: 'Quality' },
  { to: 'director', label: 'Director' },
  { to: 'publish', label: 'Publish' },
  { to: 'preview', label: 'Preview' },
];

/** Course workspace frame: tab strip + nested page. */
export const CourseLayout: React.FC = () => {
  const { courseId } = useParams();
  return (
    <div className="space-y-5">
      <nav aria-label="Course sections" className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <NavLink
            key={t.label}
            to={`/instructor/course/${courseId}${t.to ? `/${t.to}` : ''}`}
            end={t.end}
            className={({ isActive }) =>
              `px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px ${
                isActive ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
};

export default CourseLayout;
