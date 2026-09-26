/**
 * Central URL map for Vaughan Code University.
 *
 * The app historically navigated with an in-memory `activeTab` string. Routing is now
 * URL-driven: the current tab, course and lesson are derived from the pathname, and the
 * legacy setters (`setActiveTab`, `setSelectedCourseId`, `setSelectedLessonId`) navigate.
 * This keeps every existing component contract intact while making views bookmarkable.
 */

export type AppTab =
  | 'community'
  | 'classroom'
  | 'calendar'
  | 'members'
  | 'leaderboards'
  | 'creator'
  | 'profile'
  | 'admin';

/** Base path for each top-level tab. `creator` is the Instructor Studio entry point. */
export const TAB_PATHS: Record<AppTab, string> = {
  community: '/community',
  classroom: '/classroom',
  calendar: '/calendar',
  members: '/members',
  leaderboards: '/leaderboards',
  creator: '/instructor',
  profile: '/profile',
  admin: '/admin',
};

export const routes = {
  tab: (tab: AppTab) => TAB_PATHS[tab],
  course: (courseId: string) => `/classroom/${encodeURIComponent(courseId)}`,
  lesson: (courseId: string, lessonId: string) =>
    `/classroom/${encodeURIComponent(courseId)}/lesson/${encodeURIComponent(lessonId)}`,

  // Instructor Studio (reserved; screens arrive with the AI Course Factory build)
  instructor: () => '/instructor',
  instructorKnowledge: () => '/instructor/knowledge',
  instructorCourses: () => '/instructor/courses',
  instructorCourse: (courseId: string) => `/instructor/course/${encodeURIComponent(courseId)}`,
  instructorCurriculum: (courseId: string) =>
    `/instructor/course/${encodeURIComponent(courseId)}/curriculum`,
  instructorLesson: (courseId: string, lessonId: string) =>
    `/instructor/course/${encodeURIComponent(courseId)}/lesson/${encodeURIComponent(lessonId)}`,
  instructorVisuals: (courseId: string) =>
    `/instructor/course/${encodeURIComponent(courseId)}/visuals`,
  instructorQuality: (courseId: string) =>
    `/instructor/course/${encodeURIComponent(courseId)}/quality`,
};

export interface ParsedRoute {
  tab: AppTab;
  courseId: string | null;
  lessonId: string | null;
  /** Remaining path segments under /instructor, e.g. ['course', 'abc', 'visuals']. */
  instructorPath: string[];
}

const LEGACY_ALIASES: Record<string, AppTab> = {
  '': 'community',
  leaderboard: 'leaderboards',
  creator: 'creator',
  studio: 'creator',
};

export function parseRoute(pathname: string): ParsedRoute {
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
  const head = segments[0] ?? '';

  const tabFromPath = (Object.keys(TAB_PATHS) as AppTab[]).find(
    (tab) => TAB_PATHS[tab] === `/${head}`,
  );
  const tab: AppTab = tabFromPath ?? LEGACY_ALIASES[head] ?? 'community';

  if (tab === 'classroom') {
    return {
      tab,
      courseId: segments[1] ?? null,
      lessonId: segments[2] === 'lesson' ? segments[3] ?? null : null,
      instructorPath: [],
    };
  }

  return {
    tab,
    courseId: null,
    lessonId: null,
    instructorPath: tab === 'creator' && head === 'instructor' ? segments.slice(1) : [],
  };
}

/** The canonical path for a parsed route; used to normalise legacy/unknown URLs. */
export function canonicalPath(route: ParsedRoute): string {
  if (route.tab === 'classroom' && route.courseId) {
    return route.lessonId ? routes.lesson(route.courseId, route.lessonId) : routes.course(route.courseId);
  }
  if (route.tab === 'creator') {
    return ['/instructor', ...route.instructorPath.map(encodeURIComponent)].join('/');
  }
  return TAB_PATHS[route.tab];
}
