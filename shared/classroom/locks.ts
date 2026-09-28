import type { LockRule, LockState, ClassroomCourse, ClassroomModule, ClassroomLesson, LessonItem } from './types.js';

export interface LockEvalContext {
  viewerLevel: number;
  completedLessonIds: Set<string>;
  bestScores: Map<string, number>;
  now: Date;
  orderedLessonIds: string[];
  currentLessonId?: string;
  titles?: Map<string, string>;
}

export function evaluateLock(
  rule: LockRule,
  ctx: LockEvalContext
): { locked: boolean; reason: string } {
  switch (rule.type) {
    case 'manual': {
      return {
        locked: true,
        reason: 'Locked by instructor',
      };
    }

    case 'after_previous': {
      if (!ctx.currentLessonId || ctx.orderedLessonIds.length === 0) {
        return { locked: false, reason: '' };
      }
      const idx = ctx.orderedLessonIds.indexOf(ctx.currentLessonId);
      if (idx <= 0) {
        // First lesson in course order has no previous lesson
        return { locked: false, reason: '' };
      }
      const prevLessonId = ctx.orderedLessonIds[idx - 1];
      if (ctx.completedLessonIds.has(prevLessonId)) {
        return { locked: false, reason: '' };
      }
      const prevTitle = ctx.titles?.get(prevLessonId);
      const reason = prevTitle
        ? `Unlocks after you complete "${prevTitle}"`
        : 'Unlocks after you complete the previous lesson';
      return { locked: true, reason };
    }

    case 'after_lesson': {
      if (ctx.completedLessonIds.has(rule.lessonId)) {
        return { locked: false, reason: '' };
      }
      const targetTitle = ctx.titles?.get(rule.lessonId);
      const reason = targetTitle
        ? `Unlocks after you complete "${targetTitle}"`
        : 'Unlocks after you complete the required lesson';
      return { locked: true, reason };
    }

    case 'after_quiz': {
      const best = ctx.bestScores.get(rule.itemId) ?? 0;
      if (best >= rule.minScore) {
        return { locked: false, reason: '' };
      }
      const quizTitle = ctx.titles?.get(rule.itemId);
      const reason = quizTitle
        ? `Unlocks after you pass "${quizTitle}" with ${rule.minScore}% or more`
        : `Unlocks after you pass the required quiz with ${rule.minScore}% or more`;
      return { locked: true, reason };
    }

    case 'min_level': {
      if (ctx.viewerLevel >= rule.level) {
        return { locked: false, reason: '' };
      }
      return {
        locked: true,
        reason: `Requires Level ${rule.level}`,
      };
    }

    case 'date': {
      const unlockDate = new Date(rule.at);
      if (ctx.now >= unlockDate) {
        return { locked: false, reason: '' };
      }
      return {
        locked: true,
        reason: `Unlocks on ${rule.at}`,
      };
    }

    default: {
      return { locked: false, reason: '' };
    }
  }
}

export function buildLockState(
  lockRow: { id: string; rule: LockRule; message?: string | null },
  ctx: LockEvalContext,
  isInstructor: boolean
): LockState {
  const evalResult = evaluateLock(lockRow.rule, ctx);

  const level1NoProgressCtx: LockEvalContext = {
    ...ctx,
    viewerLevel: 1,
    completedLessonIds: new Set(),
    bestScores: new Map(),
  };
  const studentEval = evaluateLock(lockRow.rule, level1NoProgressCtx);
  const wouldBlockStudents = studentEval.locked;

  const reason = lockRow.message?.trim() || evalResult.reason || studentEval.reason || '';

  return {
    lockId: lockRow.id,
    rule: lockRow.rule,
    message: lockRow.message ?? null,
    locked: isInstructor ? false : evalResult.locked,
    wouldBlockStudents,
    reason,
  };
}

/**
 * Propagates parent lock rules down to children in a course hierarchy.
 * If a parent (Course or Module or Lesson) is locked for the viewer (or would block students),
 * its child items inherit locked status and reason.
 */
export function applyParentLocks(courses: ClassroomCourse[]): ClassroomCourse[] {
  return courses.map((course) => {
    const courseLock = course.lock;

    const updatedModules: ClassroomModule[] = course.modules.map((module) => {
      let moduleLock = module.lock;
      if (courseLock && (courseLock.locked || courseLock.wouldBlockStudents)) {
        if (!moduleLock) {
          moduleLock = {
            lockId: courseLock.lockId,
            rule: courseLock.rule,
            message: courseLock.message,
            locked: courseLock.locked,
            wouldBlockStudents: courseLock.wouldBlockStudents,
            reason: courseLock.reason,
          };
        } else {
          moduleLock = {
            ...moduleLock,
            locked: moduleLock.locked || courseLock.locked,
            wouldBlockStudents: moduleLock.wouldBlockStudents || courseLock.wouldBlockStudents,
            reason: moduleLock.locked ? moduleLock.reason : (courseLock.locked ? courseLock.reason : moduleLock.reason),
          };
        }
      }

      const updatedLessons: ClassroomLesson[] = module.lessons.map((lesson) => {
        let lessonLock = lesson.lock;
        const effectiveParentLock = moduleLock || courseLock;
        if (effectiveParentLock && (effectiveParentLock.locked || effectiveParentLock.wouldBlockStudents)) {
          if (!lessonLock) {
            lessonLock = {
              lockId: effectiveParentLock.lockId,
              rule: effectiveParentLock.rule,
              message: effectiveParentLock.message,
              locked: effectiveParentLock.locked,
              wouldBlockStudents: effectiveParentLock.wouldBlockStudents,
              reason: effectiveParentLock.reason,
            };
          } else {
            lessonLock = {
              ...lessonLock,
              locked: lessonLock.locked || effectiveParentLock.locked,
              wouldBlockStudents: lessonLock.wouldBlockStudents || effectiveParentLock.wouldBlockStudents,
              reason: lessonLock.locked ? lessonLock.reason : (effectiveParentLock.locked ? effectiveParentLock.reason : lessonLock.reason),
            };
          }
        }

        const updatedItems: LessonItem[] = lesson.items.map((item) => {
          let itemLock = item.lock;
          const effectiveLessonParentLock = lessonLock || effectiveParentLock;
          if (effectiveLessonParentLock && (effectiveLessonParentLock.locked || effectiveLessonParentLock.wouldBlockStudents)) {
            if (!itemLock) {
              itemLock = {
                lockId: effectiveLessonParentLock.lockId,
                rule: effectiveLessonParentLock.rule,
                message: effectiveLessonParentLock.message,
                locked: effectiveLessonParentLock.locked,
                wouldBlockStudents: effectiveLessonParentLock.wouldBlockStudents,
                reason: effectiveLessonParentLock.reason,
              };
            } else {
              itemLock = {
                ...itemLock,
                locked: itemLock.locked || effectiveLessonParentLock.locked,
                wouldBlockStudents: itemLock.wouldBlockStudents || effectiveLessonParentLock.wouldBlockStudents,
                reason: itemLock.locked ? itemLock.reason : (effectiveLessonParentLock.locked ? effectiveLessonParentLock.reason : itemLock.reason),
              };
            }
          }

          return { ...item, lock: itemLock };
        });

        return { ...lesson, lock: lessonLock, items: updatedItems };
      });

      return { ...module, lock: moduleLock, lessons: updatedLessons };
    });

    return { ...course, modules: updatedModules };
  });
}
