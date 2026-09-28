import type { Course, Lesson } from '../../types';
import type {
  ClassroomCourse,
  ClassroomModule,
  ClassroomLesson,
  LessonItem,
  QuizQuestion,
  ItemPayload,
} from '../../../shared/classroom/types';

export function parseYouTubeId(url?: string): string | undefined {
  if (!url) return undefined;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : undefined;
}

export function convertLegacyCourseToClassroomCourse(
  course: Course,
  options: {
    completedLessonIds?: string[];
    userLevel?: number;
    userTier?: string;
  } = {}
): ClassroomCourse {
  const { completedLessonIds = [], userLevel = 1, userTier = 'free' } = options;

  const isCourseLockedByLevel = course.requiredLevel > userLevel;
  const isCourseLockedByTier = course.requiredTier !== 'free' && userTier === 'free';

  const courseLock = isCourseLockedByLevel
    ? {
        lockId: `lock-course-lvl-${course.id}`,
        rule: { type: 'min_level' as const, level: course.requiredLevel },
        message: null,
        locked: true,
        wouldBlockStudents: true,
        reason: `Requires Level ${course.requiredLevel}`,
      }
    : isCourseLockedByTier
    ? {
        lockId: `lock-course-tier-${course.id}`,
        rule: { type: 'manual' as const },
        message: 'Subscription required',
        locked: true,
        wouldBlockStudents: true,
        reason: `Requires ${course.requiredTier.toUpperCase()} Subscription`,
      }
    : null;

  const modules: ClassroomModule[] = course.modules.map((mod, modIdx) => {
    const lessons: ClassroomLesson[] = mod.lessons.map((les, lesIdx) => {
      const isLesLockedByLevel = (les.lockedLevel || 1) > userLevel;
      const isLesLockedByTier = Boolean(les.isProOnly) && userTier === 'free';

      const lessonLock = isLesLockedByLevel
        ? {
            lockId: `lock-les-lvl-${les.id}`,
            rule: { type: 'min_level' as const, level: les.lockedLevel! },
            message: null,
            locked: true,
            wouldBlockStudents: true,
            reason: `Requires Level ${les.lockedLevel}`,
          }
        : isLesLockedByTier
        ? {
            lockId: `lock-les-tier-${les.id}`,
            rule: { type: 'manual' as const },
            message: 'Pro Exclusive',
            locked: true,
            wouldBlockStudents: true,
            reason: 'Requires Pro Subscription',
          }
        : null;

      const items: LessonItem[] = [];

      // 1. Video item
      if (les.videoUrl) {
        const ytId = parseYouTubeId(les.videoUrl);
        const payload: ItemPayload = {
          kind: 'video',
          youtubeId: ytId,
          url: les.videoUrl,
          transcript: les.audioTranscript,
        };
        items.push({
          id: `${les.id}-item-video`,
          lessonId: les.id,
          kind: 'video',
          slot: 'main',
          position: items.length + 1,
          title: les.title,
          payload,
          sourceRefs: [],
          provenance: 'imported',
          published: true,
          version: 1,
          lock: null,
        });
      }

      // 2. Audio item
      if (les.audioUrl) {
        const payload: ItemPayload = {
          kind: 'audio',
          url: les.audioUrl,
          transcript: les.audioTranscript,
          durationSeconds: (les.durationMinutes || 0) * 60,
        };
        items.push({
          id: `${les.id}-item-audio`,
          lessonId: les.id,
          kind: 'audio',
          slot: 'main',
          position: items.length + 1,
          title: les.title,
          payload,
          sourceRefs: [],
          provenance: 'imported',
          published: true,
          version: 1,
          lock: null,
        });
      }

      // 3. PDF item
      if (les.pdfUrl) {
        const payload: ItemPayload = {
          kind: 'pdf',
          url: les.pdfUrl,
          fileName: les.pdfFileName,
        };
        items.push({
          id: `${les.id}-item-pdf`,
          lessonId: les.id,
          kind: 'pdf',
          slot: 'section',
          position: items.length + 1,
          title: les.pdfFileName || 'PDF Blueprint',
          payload,
          sourceRefs: [],
          provenance: 'imported',
          published: true,
          version: 1,
          lock: null,
        });
      }

      // 4. Reading item
      if (les.contentMarkdown) {
        const payload: ItemPayload = {
          kind: 'reading',
          markdown: les.contentMarkdown,
        };
        items.push({
          id: `${les.id}-item-reading`,
          lessonId: les.id,
          kind: 'reading',
          slot: 'section',
          position: items.length + 1,
          title: 'Lesson Notes',
          payload,
          sourceRefs: [],
          provenance: 'imported',
          published: true,
          version: 1,
          lock: null,
        });
      }

      // 5. Quiz item
      if (les.quiz) {
        const questions: QuizQuestion[] = les.quiz.questions.map((q) => ({
          id: q.id,
          prompt: q.question,
          type: 'single',
          options: q.options.map((optText, optIdx) => ({
            id: `opt-${optIdx}`,
            text: optText,
          })),
          correctOptionIds: [`opt-${q.correctAnswerIndex}`],
          explanation: q.explanation,
          sourceRefs: [],
        }));

        const payload: ItemPayload = {
          kind: 'quiz',
          passingScorePercent: les.quiz.passingScorePercentage || 80,
          xpReward: les.quiz.xpReward,
          questions,
        };

        items.push({
          id: `${les.id}-item-quiz`,
          lessonId: les.id,
          kind: 'quiz',
          slot: 'main',
          position: items.length + 1,
          title: les.quiz.title || 'Knowledge Check',
          payload,
          sourceRefs: [],
          provenance: 'imported',
          published: true,
          version: 1,
          lock: null,
        });
      }

      // 6. Resource items
      if (les.resources && les.resources.length > 0) {
        les.resources.forEach((res, resIdx) => {
          const payload: ItemPayload = {
            kind: 'resource',
            url: res.url,
            resourceType: res.type,
            size: res.size,
          };
          items.push({
            id: `${les.id}-item-res-${resIdx}`,
            lessonId: les.id,
            kind: 'resource',
            slot: 'resource',
            position: items.length + 1,
            title: res.title,
            payload,
            sourceRefs: [],
            provenance: 'imported',
            published: true,
            version: 1,
            lock: null,
          });
        });
      }

      // Fallback reading item if no items generated
      if (items.length === 0) {
        const payload: ItemPayload = {
          kind: 'reading',
          markdown: les.description || les.title,
        };
        items.push({
          id: `${les.id}-item-fallback`,
          lessonId: les.id,
          kind: 'reading',
          slot: 'main',
          position: 1,
          title: les.title,
          payload,
          sourceRefs: [],
          provenance: 'imported',
          published: true,
          version: 1,
          lock: null,
        });
      }

      return {
        id: les.id,
        legacyId: les.id,
        moduleId: mod.id,
        title: les.title,
        description: les.description || null,
        type: les.type,
        durationMinutes: les.durationMinutes || 0,
        xpReward: les.xpReward || 0,
        position: lesIdx + 1,
        isProOnly: Boolean(les.isProOnly),
        lockedLevel: les.lockedLevel || null,
        items,
        lock: lessonLock,
        completed: completedLessonIds.includes(les.id),
      };
    });

    return {
      id: mod.id,
      legacyId: mod.id,
      title: mod.title,
      description: mod.description || null,
      position: modIdx + 1,
      lessons,
      lock: null,
    };
  });

  return {
    id: course.id,
    legacyId: course.id,
    courseCode: course.courseCode || null,
    title: course.title,
    slug: course.slug,
    tagline: course.tagline || null,
    description: course.description || null,
    thumbnailUrl: course.thumbnail || null,
    badge: course.badge || null,
    category: course.category || null,
    requiredTier: course.requiredTier || 'free',
    requiredLevel: course.requiredLevel || 1,
    position: 1,
    modules,
    lock: courseLock,
  };
}
