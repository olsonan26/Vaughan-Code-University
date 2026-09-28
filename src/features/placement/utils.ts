import type { LockRule, PlacementTarget, ItemKind } from '../../../shared/classroom/types';
import type { StudioTreeCourse } from './api';

/**
 * Parses a YouTube URL or video ID string and returns the 11-character video ID.
 */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const str = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  try {
    const urlObj = new URL(str.startsWith('http') ? str : `https://${str}`);
    const host = urlObj.hostname.replace('www.', '');

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (urlObj.pathname === '/watch') {
        const v = urlObj.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      }
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'embed' || pathParts[0] === 'v' || pathParts[0] === 'shorts') {
        const id = pathParts[1];
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
    } else if (host === 'youtu.be') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const id = pathParts[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // Ignore invalid URL format
  }
  return null;
}

export type LockTitlesMap =
  | {
      lessons?: Record<string, string>;
      quizzes?: Record<string, string>;
    }
  | Record<string, string>;

function resolveTitle(
  id: string,
  kind: 'lessons' | 'quizzes',
  titles?: LockTitlesMap
): string | undefined {
  if (!titles) return undefined;
  if ('lessons' in titles || 'quizzes' in titles) {
    const nestedMap = (titles as { lessons?: Record<string, string>; quizzes?: Record<string, string> })[kind];
    if (nestedMap && nestedMap[id]) return nestedMap[id];
  }
  if (id in titles && typeof (titles as Record<string, string>)[id] === 'string') {
    return (titles as Record<string, string>)[id];
  }
  return undefined;
}

/**
 * Converts a LockRule into a human-friendly string description.
 */
export function describeLockRule(
  rule: LockRule | null,
  titles?: LockTitlesMap
): string {
  if (!rule) {
    return 'No lock';
  }

  switch (rule.type) {
    case 'manual':
      return 'Locked (manual)';
    case 'after_previous':
      return 'locked until previous lesson done';
    case 'after_lesson': {
      const title = resolveTitle(rule.lessonId, 'lessons', titles) || rule.lessonId;
      return `locked until lesson '${title}' completed`;
    }
    case 'after_quiz': {
      const title = resolveTitle(rule.itemId, 'quizzes', titles) || rule.itemId;
      const minScore = rule.minScore ?? 80;
      return `locked until quiz '${title}' passed (${minScore}%)`;
    }
    case 'min_level':
      return `locked until level ${rule.level}`;
    case 'date': {
      let formattedDate = rule.at;
      try {
        const d = new Date(rule.at);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      } catch {
        // Fallback to raw string
      }
      return `locked until ${formattedDate}`;
    }
    default:
      return 'Locked';
  }
}

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  video: 'Video',
  audio: 'Audio',
  pdf: 'PDF',
  reading: 'Reading',
  image: 'Image',
  quiz: 'Quiz',
  resource: 'Resource',
  flashcards: 'Flashcards',
  worksheet: 'Worksheet',
  lesson_plan: 'Lesson Plan',
};

/**
 * Builds a breadcrumb summary string for a placement target.
 * e.g. "VC 101 > Module 2 > Teaching 2.2 > Quiz (locked until previous lesson done)"
 */
export function buildPlacementBreadcrumb(
  target: Partial<PlacementTarget>,
  context?: { courses?: StudioTreeCourse[] }
): string {
  const courses = context?.courses || [];
  const parts: string[] = [];

  // Course
  const course = courses.find((c) => c.id === target.courseId);
  if (course) {
    parts.push(course.courseCode || course.title);
  } else if (target.courseId) {
    parts.push(target.courseId);
  } else {
    parts.push('Select Course');
  }

  // Module
  if (target.moduleId === 'new') {
    parts.push(target.newModuleTitle?.trim() || 'New module');
  } else if (target.moduleId && course) {
    const mod = course.modules?.find((m) => m.id === target.moduleId);
    parts.push(mod ? mod.title : target.moduleId);
  } else if (target.moduleId) {
    parts.push(target.moduleId);
  } else {
    parts.push('Select Module');
  }

  // Lesson
  if (target.lessonId === 'new') {
    parts.push(target.newLessonTitle?.trim() || 'New lesson');
  } else if (target.lessonId && course) {
    let foundLessonTitle: string | undefined;
    if (course.modules) {
      for (const mod of course.modules) {
        const les = mod.lessons?.find((l) => l.id === target.lessonId);
        if (les) {
          foundLessonTitle = les.title;
          break;
        }
      }
    }
    parts.push(foundLessonTitle || target.lessonId);
  } else if (target.lessonId) {
    parts.push(target.lessonId);
  } else {
    parts.push('Select Lesson');
  }

  // Kind & Lock
  const kindLabel = target.kind ? (ITEM_KIND_LABELS[target.kind] || target.kind) : 'Item';
  let itemPart = kindLabel;

  if (target.lock?.rule) {
    const lockDesc = describeLockRule(target.lock.rule);
    itemPart += ` (${lockDesc})`;
  }

  parts.push(itemPart);

  return parts.join(' > ');
}
