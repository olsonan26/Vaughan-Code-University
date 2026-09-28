import { describe, it, expect } from 'vitest';
import {
  getOpSummary,
  groupChecklistSuggestions,
  canApplyChangeSet,
} from '../kateHelpers';
import type { ChangeOp, KateSuggestion } from '../../../../shared/kate/types';

describe('Kate UI Pure Helpers', () => {
  describe('getOpSummary', () => {
    it('summarizes create_module op', () => {
      const op: ChangeOp = {
        op: 'create_module',
        tempId: 'temp_m1',
        courseId: 'course1',
        title: 'Module 1: Foundations',
      };
      expect(getOpSummary(op)).toBe('Create module "Module 1: Foundations"');
    });

    it('summarizes create_lesson op', () => {
      const op: ChangeOp = {
        op: 'create_lesson',
        tempId: 'temp_l1',
        courseId: 'course1',
        moduleId: 'm1',
        title: 'Lesson 1: Intro',
        type: 'video',
      };
      expect(getOpSummary(op)).toBe('Create lesson "Lesson 1: Intro" (video)');
    });

    it('summarizes create_item op', () => {
      const op: ChangeOp = {
        op: 'create_item',
        tempId: 'temp_i1',
        lessonId: 'l1',
        kind: 'quiz',
        slot: 'main',
        title: 'Check Your Knowledge',
        payload: { kind: 'quiz', passingScorePercent: 80, questions: [] },
        sourceRefs: [],
        provenance: 'ai_source_only',
      };
      expect(getOpSummary(op)).toBe('Create quiz item "Check Your Knowledge" in main slot');
    });

    it('summarizes set_lock op', () => {
      const op: ChangeOp = {
        op: 'set_lock',
        entityType: 'lesson',
        entityId: 'lesson-123',
        rule: { type: 'manual' },
      };
      expect(getOpSummary(op)).toBe('Set lock rule on lesson (lesson-123)');
    });
  });

  describe('groupChecklistSuggestions', () => {
    it('separates suggestions into fromSource and beyondSource', () => {
      const suggestions: KateSuggestion[] = [
        {
          id: 's1',
          action: 'quiz',
          title: 'Source Quiz',
          why: 'Covers chapter 1',
          fromSource: true,
          defaultChecked: true,
          outputKind: 'quiz',
        },
        {
          id: 's2',
          action: 'enrichment',
          title: 'Beyond Source Insight',
          why: 'Adds extra context',
          fromSource: false,
          defaultChecked: false,
          outputKind: 'reading',
        },
      ];

      const grouped = groupChecklistSuggestions(suggestions);
      expect(grouped.fromSource).toHaveLength(1);
      expect(grouped.fromSource[0].id).toBe('s1');
      expect(grouped.beyondSource).toHaveLength(1);
      expect(grouped.beyondSource[0].id).toBe('s2');
    });
  });

  describe('canApplyChangeSet', () => {
    it('allows apply when no audit object present', () => {
      expect(canApplyChangeSet({ audit: undefined })).toBe(true);
    });

    it('allows apply when audit passed is true', () => {
      expect(canApplyChangeSet({ audit: { passed: true, unsupportedClaims: [], gaps: [] } })).toBe(true);
    });

    it('blocks apply when audit passed is false and override is false', () => {
      expect(
        canApplyChangeSet({ audit: { passed: false, unsupportedClaims: [{ text: 'x', reason: 'y' }], gaps: [] } }, false)
      ).toBe(false);
    });

    it('allows apply when audit passed is false but override is true', () => {
      expect(
        canApplyChangeSet({ audit: { passed: false, unsupportedClaims: [{ text: 'x', reason: 'y' }], gaps: [] } }, true)
      ).toBe(true);
    });
  });
});
