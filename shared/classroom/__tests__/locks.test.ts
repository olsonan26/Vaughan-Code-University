import { describe, it, expect } from 'vitest';
import { evaluateLock, buildLockState, applyParentLocks, type LockEvalContext } from '../locks.js';
import type { LockRule, ClassroomCourse } from '../types.js';

describe('evaluateLock', () => {
  const baseCtx: LockEvalContext = {
    viewerLevel: 1,
    completedLessonIds: new Set(),
    bestScores: new Map(),
    now: new Date('2026-09-28T12:00:00Z'),
    orderedLessonIds: ['lesson-1', 'lesson-2', 'lesson-3'],
  };

  it('evaluates manual lock', () => {
    const rule: LockRule = { type: 'manual' };
    const res = evaluateLock(rule, baseCtx);
    expect(res.locked).toBe(true);
    expect(res.reason).toContain('Locked');
  });

  it('evaluates after_previous lock for first lesson in order', () => {
    const rule: LockRule = { type: 'after_previous' };
    const ctx = { ...baseCtx, currentLessonId: 'lesson-1' };
    const res = evaluateLock(rule, ctx);
    expect(res.locked).toBe(false);
  });

  it('evaluates after_previous lock for second lesson when previous incomplete', () => {
    const rule: LockRule = { type: 'after_previous' };
    const titles = new Map([['lesson-1', 'Intro to VC']]);
    const ctx = { ...baseCtx, currentLessonId: 'lesson-2', titles };
    const res = evaluateLock(rule, ctx);
    expect(res.locked).toBe(true);
    expect(res.reason).toBe('Unlocks after you complete "Intro to VC"');
  });

  it('evaluates after_previous lock when previous completed', () => {
    const rule: LockRule = { type: 'after_previous' };
    const ctx = {
      ...baseCtx,
      currentLessonId: 'lesson-2',
      completedLessonIds: new Set(['lesson-1']),
    };
    const res = evaluateLock(rule, ctx);
    expect(res.locked).toBe(false);
  });

  it('evaluates after_lesson lock', () => {
    const rule: LockRule = { type: 'after_lesson', lessonId: 'lesson-req' };
    const titles = new Map([['lesson-req', 'VC 101 Certification']]);

    // incomplete
    const resLocked = evaluateLock(rule, { ...baseCtx, titles });
    expect(resLocked.locked).toBe(true);
    expect(resLocked.reason).toBe('Unlocks after you complete "VC 101 Certification"');

    // complete
    const resUnlocked = evaluateLock(rule, {
      ...baseCtx,
      completedLessonIds: new Set(['lesson-req']),
    });
    expect(resUnlocked.locked).toBe(false);
  });

  it('evaluates after_quiz lock', () => {
    const rule: LockRule = { type: 'after_quiz', itemId: 'quiz-1', minScore: 80 };
    const titles = new Map([['quiz-1', 'VC 101 Certification']]);

    // score < 80
    const ctxLow = { ...baseCtx, bestScores: new Map([['quiz-1', 75]]), titles };
    const resLow = evaluateLock(rule, ctxLow);
    expect(resLow.locked).toBe(true);
    expect(resLow.reason).toBe('Unlocks after you pass "VC 101 Certification" with 80% or more');

    // score >= 80
    const ctxHigh = { ...baseCtx, bestScores: new Map([['quiz-1', 80]]), titles };
    const resHigh = evaluateLock(rule, ctxHigh);
    expect(resHigh.locked).toBe(false);
  });

  it('evaluates min_level lock', () => {
    const rule: LockRule = { type: 'min_level', level: 3 };

    // level 1 < 3
    const resLow = evaluateLock(rule, { ...baseCtx, viewerLevel: 1 });
    expect(resLow.locked).toBe(true);
    expect(resLow.reason).toBe('Requires Level 3');

    // level 3 >= 3
    const resHigh = evaluateLock(rule, { ...baseCtx, viewerLevel: 3 });
    expect(resHigh.locked).toBe(false);
  });

  it('evaluates date lock', () => {
    const rule: LockRule = { type: 'date', at: '2026-10-01T00:00:00Z' };

    // before
    const resBefore = evaluateLock(rule, {
      ...baseCtx,
      now: new Date('2026-09-28T00:00:00Z'),
    });
    expect(resBefore.locked).toBe(true);
    expect(resBefore.reason).toContain('Unlocks on 2026-10-01');

    // after
    const resAfter = evaluateLock(rule, {
      ...baseCtx,
      now: new Date('2026-10-02T00:00:00Z'),
    });
    expect(resAfter.locked).toBe(false);
  });
});

describe('buildLockState', () => {
  const baseCtx: LockEvalContext = {
    viewerLevel: 1,
    completedLessonIds: new Set(),
    bestScores: new Map(),
    now: new Date('2026-09-28T12:00:00Z'),
    orderedLessonIds: [],
  };

  it('builds LockState for student vs instructor', () => {
    const lockRow = {
      id: 'lock-1',
      rule: { type: 'min_level', level: 2 } as LockRule,
      message: 'Level 2 required for bonus content',
    };

    // Student (level 1)
    const studentState = buildLockState(lockRow, baseCtx, false);
    expect(studentState.locked).toBe(true);
    expect(studentState.wouldBlockStudents).toBe(true);
    expect(studentState.reason).toBe('Level 2 required for bonus content');

    // Instructor (never blocked)
    const instructorState = buildLockState(lockRow, baseCtx, true);
    expect(instructorState.locked).toBe(false);
    expect(instructorState.wouldBlockStudents).toBe(true);
  });
});

describe('applyParentLocks', () => {
  it('propagates course level lock down to modules, lessons, and items', () => {
    const courses: ClassroomCourse[] = [
      {
        id: 'c1',
        legacyId: null,
        courseCode: 'CS101',
        title: 'Course 1',
        slug: 'course-1',
        tagline: null,
        description: null,
        thumbnailUrl: null,
        badge: null,
        category: null,
        requiredTier: 'free',
        requiredLevel: 1,
        position: 0,
        lock: {
          lockId: 'lock-c1',
          rule: { type: 'manual' },
          message: 'Course locked',
          locked: true,
          wouldBlockStudents: true,
          reason: 'Course locked',
        },
        modules: [
          {
            id: 'm1',
            legacyId: null,
            title: 'Module 1',
            description: null,
            position: 0,
            lock: null,
            lessons: [
              {
                id: 'l1',
                legacyId: null,
                moduleId: 'm1',
                title: 'Lesson 1',
                description: null,
                type: 'article',
                durationMinutes: 10,
                xpReward: 20,
                position: 0,
                isProOnly: false,
                lockedLevel: null,
                completed: false,
                lock: null,
                items: [
                  {
                    id: 'i1',
                    lessonId: 'l1',
                    kind: 'reading',
                    slot: 'main',
                    position: 0,
                    title: 'Item 1',
                    payload: { kind: 'reading', markdown: 'hello' },
                    sourceRefs: [],
                    provenance: 'instructor',
                    published: true,
                    version: 1,
                    lock: null,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const result = applyParentLocks(courses);
    expect(result[0].modules[0].lock?.locked).toBe(true);
    expect(result[0].modules[0].lessons[0].lock?.locked).toBe(true);
    expect(result[0].modules[0].lessons[0].items[0].lock?.locked).toBe(true);
  });
});
