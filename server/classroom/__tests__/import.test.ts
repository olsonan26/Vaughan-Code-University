import { describe, it, expect } from 'vitest';
import { INITIAL_COURSES } from '../../../src/data/initialData.js';
import { importCatalog, InMemoryClassroomImportRepository } from '../import.js';

describe('importCatalog', () => {
  it('imports INITIAL_COURSES idempotently (running twice yields identical counts and map sizes)', async () => {
    const repo = new InMemoryClassroomImportRepository();
    const orgId = '00000000-0000-0000-0000-000000000001';

    const counts1 = await importCatalog(repo, orgId, INITIAL_COURSES);

    const initialCoursesCount = repo.coursesMap.size;
    const initialModulesCount = repo.modulesMap.size;
    const initialLessonsCount = repo.lessonsMap.size;
    const initialItemsCount = repo.lessonItemsMap.size;
    const initialLocksCount = repo.locksMap.size;

    expect(counts1.courses).toBe(INITIAL_COURSES.length);
    expect(counts1.courses).toBeGreaterThan(0);
    expect(counts1.modules).toBeGreaterThan(0);
    expect(counts1.lessons).toBeGreaterThan(0);
    expect(counts1.items).toBeGreaterThan(0);

    // Second run
    const counts2 = await importCatalog(repo, orgId, INITIAL_COURSES);

    expect(counts2).toEqual(counts1);
    expect(repo.coursesMap.size).toBe(initialCoursesCount);
    expect(repo.modulesMap.size).toBe(initialModulesCount);
    expect(repo.lessonsMap.size).toBe(initialLessonsCount);
    expect(repo.lessonItemsMap.size).toBe(initialItemsCount);
    expect(repo.locksMap.size).toBe(initialLocksCount);
  });

  it('faithfully maps a real INITIAL_COURSES lesson with a quiz', async () => {
    const repo = new InMemoryClassroomImportRepository();
    const orgId = '00000000-0000-0000-0000-000000000001';

    await importCatalog(repo, orgId, INITIAL_COURSES);

    // Find quiz les-1-12 in imported items
    const quizItemEntry = Array.from(repo.lessonItemsMap.values()).find(
      (item) => item.payload.legacyKey === 'les-1-12:quiz:quiz-1'
    );

    expect(quizItemEntry).toBeDefined();
    expect(quizItemEntry.kind).toBe('quiz');
    expect(quizItemEntry.provenance).toBe('imported');
    expect(quizItemEntry.title).toBe('VC 101 Certification: Language Code Foundations');

    const payload = quizItemEntry.payload;
    expect(payload.passingScorePercent).toBe(80);
    expect(payload.xpReward).toBe(50);
    expect(payload.questions).toHaveLength(4);

    const q1 = payload.questions[0];
    expect(q1.id).toBe('q1-1');
    expect(q1.prompt).toContain('Why should a result such as 28 → 10 → 1 be preserved');
    expect(q1.type).toBe('single');
    expect(q1.options).toHaveLength(4);
    expect(q1.options[0]).toEqual({
      id: '0',
      text: 'Because the compound trail preserves how the root number was reached',
    });
    expect(q1.correctOptionIds).toEqual(['0']);
    expect(q1.explanation).toContain('The Vaughan Code preserves the calculation route');
  });
});
