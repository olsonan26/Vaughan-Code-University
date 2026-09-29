import { describe, expect, it } from 'vitest';
import { sanitizeChangeset, buildCourseDirectorRequest } from '../course-director/index.js';
import { sanitizeFindings, buildConsistencyAuditorRequest } from '../consistency-auditor/index.js';
import {
  objectiveCoverage,
  fleschKincaidGrade,
  visualCoverage,
  publishReadiness,
} from '../quality/deterministic.js';

describe('Course Director & Consistency Auditor sanitize functions', () => {
  it('sanitizeChangeset drops items with unknown non-null targetId', () => {
    const output = {
      analysis: 'Test analysis',
      findings: [],
      changeset: {
        title: 'Proposed updates',
        rationale: 'Fix issues',
        items: [
          {
            targetType: 'lesson' as const,
            targetId: 'lesson-1',
            operation: 'update' as const,
            field: 'title',
            before: 'Old Title',
            after: 'New Title',
            reason: 'Clarity',
          },
          {
            targetType: 'lesson' as const,
            targetId: 'lesson-unknown',
            operation: 'delete' as const,
            field: null,
            before: null,
            after: null,
            reason: 'Obsolete',
          },
          {
            targetType: 'lesson' as const,
            targetId: null,
            operation: 'insert' as const,
            field: null,
            before: null,
            after: 'New Lesson',
            reason: 'Missing topic',
          },
        ],
        affected: {
          lessons: ['lesson-1'],
          quizzes: [],
          visuals: [],
          concepts: [],
        },
      },
    };

    const allowedIds = new Set(['module-1', 'lesson-1']);
    const sanitized = sanitizeChangeset(output, allowedIds);

    expect(sanitized.changeset).not.toBeNull();
    expect(sanitized.changeset!.items).toHaveLength(2);
    expect(sanitized.changeset!.items.map((i) => i.targetId)).toEqual(['lesson-1', null]);
  });

  it('sanitizeFindings drops unknown target refs and drops findings left with no targets', () => {
    const output = {
      findings: [
        {
          category: 'contradiction' as const,
          severity: 'critical' as const,
          title: 'Contradictory definitions',
          detail: 'Definition in lesson 1 contradicts lesson 2',
          targets: [
            { type: 'lesson' as const, id: 'lesson-1' },
            { type: 'lesson' as const, id: 'unknown-lesson' },
          ],
          suggestedFix: 'Align definitions',
        },
        {
          category: 'duplication' as const,
          severity: 'warning' as const,
          title: 'Duplicate content',
          detail: 'Content duplicated',
          targets: [{ type: 'lesson' as const, id: 'unknown-lesson-2' }],
          suggestedFix: 'Remove duplication',
        },
      ],
    };

    const allowedIds = new Set(['lesson-1', 'lesson-2']);
    const sanitized = sanitizeFindings(output, allowedIds);

    expect(sanitized.findings).toHaveLength(1);
    expect(sanitized.findings[0].targets).toEqual([{ type: 'lesson', id: 'lesson-1' }]);
  });

  it('buildCourseDirectorRequest creates valid SkillRequest', () => {
    const req = buildCourseDirectorRequest({
      request: 'Review module sequence',
      snapshot: {
        title: 'Intro Course',
        modules: [
          {
            id: 'mod-1',
            title: 'Module 1',
            lessons: [
              {
                id: 'les-1',
                title: 'Lesson 1',
                objectives: ['Learn A'],
                summary: 'Summary A',
              },
            ],
          },
        ],
      },
      constraints: ['Do not change Module 1'],
      locked: [],
    });

    expect(req.skill).toBe('course-director');
    expect(req.promptVersion).toBe('course-director-v1');
    expect(req.tier).toBe('MAX');
  });

  it('buildConsistencyAuditorRequest creates valid SkillRequest', () => {
    const req = buildConsistencyAuditorRequest({
      snapshot: {
        title: 'Intro Course',
        modules: [],
      },
      concepts: [{ name: 'Concept A', shortDefinition: 'Def A' }],
      readingLevel: 'Grade 8',
    });

    expect(req.skill).toBe('consistency-auditor');
    expect(req.promptVersion).toBe('course-consistency-v1');
    expect(req.tier).toBe('HIGH');
  });
});

describe('Deterministic Quality Functions', () => {
  it('objectiveCoverage finds zero-question objectives', () => {
    const objectives = [
      { id: 'obj-1', text: 'Understand variables' },
      { id: 'obj-2', text: 'Understand functions' },
      { id: 'obj-3', text: 'Understand loops' },
    ];

    const questions = [
      { objectiveIds: ['obj-1'] },
      { objectiveIds: ['obj-1', 'obj-2'] },
    ];

    const coverage = objectiveCoverage(objectives, questions);

    expect(coverage).toHaveLength(3);
    expect(coverage.find((c) => c.objectiveId === 'obj-1')?.questionCount).toBe(2);
    expect(coverage.find((c) => c.objectiveId === 'obj-2')?.questionCount).toBe(1);

    const zeroCoverage = coverage.find((c) => c.objectiveId === 'obj-3');
    expect(zeroCoverage?.questionCount).toBe(0);
  });

  it('fleschKincaidGrade computes simple < complex', () => {
    const simpleText = 'The cat sat on the mat. The dog ran in the yard. It was fun.';
    const complexText = `
      # Advanced Epistemological Synthesis
      The philosophical implications of multi-faceted methodological framework paradigms
      necessitate rigorous empirical validation and programmatic analytical categorization.
    `;

    const simpleGrade = fleschKincaidGrade(simpleText);
    const complexGrade = fleschKincaidGrade(complexText);

    expect(simpleGrade).toBeLessThan(complexGrade);
  });

  it('visualCoverage categorizes slots correctly', () => {
    const slots = [
      { need: 'essential', status: 'approved' },
      { need: 'essential', status: 'missing' },
      { need: 'helpful', status: 'uploaded' },
      { need: 'helpful', status: 'draft' },
    ];

    const result = visualCoverage(slots);

    expect(result.total).toBe(4);
    expect(result.completed).toBe(2);
    expect(result.essentialMissing).toBe(1);
    expect(result.helpfulMissing).toBe(1);
  });

  it('publishReadiness identifies blockers and warnings correctly', () => {
    const blockedInput = {
      moduleCount: 0,
      lessonsTotal: 2,
      lessonsWithContent: 1,
      unresolvedCriticalFindings: 1,
      openCanonicalConflicts: 1,
      certification: true,
      objectivesUnassessed: 1,
      essentialVisualsMissing: 2,
      curriculumApproved: false,
    };

    const blockedResult = publishReadiness(blockedInput);

    expect(blockedResult.blockers).toContain('No modules in course');
    expect(blockedResult.blockers).toContain('Missing lesson content');
    expect(blockedResult.blockers).toContain('Unresolved canonical conflict');
    expect(blockedResult.blockers).toContain('Critical unsupported claim');
    expect(blockedResult.blockers).toContain('Certification with unassessed objectives');
    expect(blockedResult.blockers).toContain('Curriculum not approved');
    expect(blockedResult.warnings).toContain('Essential visuals missing');

    const readyInput = {
      moduleCount: 3,
      lessonsTotal: 6,
      lessonsWithContent: 6,
      unresolvedCriticalFindings: 0,
      openCanonicalConflicts: 0,
      certification: true,
      objectivesUnassessed: 0,
      essentialVisualsMissing: 0,
      curriculumApproved: true,
    };

    const readyResult = publishReadiness(readyInput);

    expect(readyResult.blockers).toHaveLength(0);
    expect(readyResult.warnings).toHaveLength(0);
    expect(readyResult.checks.every((c) => c.ok)).toBe(true);
  });
});
