import React, { useMemo } from 'react';
import type { LockRule } from '../../../shared/classroom/types';
import { describeLockRule, LockTitlesMap } from './utils';
import { Lock, Unlock, ShieldAlert, Calendar, Award, BookOpen, CheckSquare } from 'lucide-react';

export { describeLockRule };

export interface LockEditorProps {
  value: LockRule | null;
  onChange: (rule: LockRule | null) => void;
  lessonsForSelect: { id: string; title: string }[];
  quizzesForSelect?: { id: string; title: string }[];
}

type LockTypeKey =
  | 'none'
  | 'manual'
  | 'after_previous'
  | 'after_lesson'
  | 'after_quiz'
  | 'min_level'
  | 'date';

export const LockEditor: React.FC<LockEditorProps> = ({
  value,
  onChange,
  lessonsForSelect,
  quizzesForSelect = [],
}) => {
  // Determine current active lock type key
  const activeType: LockTypeKey = useMemo(() => {
    if (!value) return 'none';
    return value.type;
  }, [value]);

  // Construct titles lookup map for preview helper
  const titlesMap: LockTitlesMap = useMemo(() => {
    const lessons: Record<string, string> = {};
    for (const l of lessonsForSelect) {
      lessons[l.id] = l.title;
    }
    const quizzes: Record<string, string> = {};
    for (const q of quizzesForSelect) {
      quizzes[q.id] = q.title;
    }
    return { lessons, quizzes };
  }, [lessonsForSelect, quizzesForSelect]);

  const handleTypeChange = (newType: LockTypeKey) => {
    if (newType === 'none') {
      onChange(null);
      return;
    }
    if (newType === 'manual') {
      onChange({ type: 'manual' });
      return;
    }
    if (newType === 'after_previous') {
      onChange({ type: 'after_previous' });
      return;
    }
    if (newType === 'after_lesson') {
      const defaultLessonId = lessonsForSelect[0]?.id || '';
      onChange({ type: 'after_lesson', lessonId: defaultLessonId });
      return;
    }
    if (newType === 'after_quiz') {
      const defaultQuizId = quizzesForSelect[0]?.id || '';
      onChange({ type: 'after_quiz', itemId: defaultQuizId, minScore: 80 });
      return;
    }
    if (newType === 'min_level') {
      onChange({ type: 'min_level', level: 1 });
      return;
    }
    if (newType === 'date') {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
      onChange({ type: 'date', at: tomorrow });
      return;
    }
  };

  const previewSentence = useMemo(() => {
    return describeLockRule(value, titlesMap);
  }, [value, titlesMap]);

  return (
    <div className="space-y-4 text-slate-800">
      <div className="space-y-1.5">
        <label htmlFor="lock-rule-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Access Restriction / Lock Rule
        </label>
        <select
          id="lock-rule-type"
          aria-label="Access restriction / lock rule"
          value={activeType}
          onChange={(e) => handleTypeChange(e.target.value as LockTypeKey)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="none">No lock (Immediately accessible)</option>
          <option value="manual">Locked (Manual unlock by instructor)</option>
          <option value="after_previous">After previous lesson is completed</option>
          <option value="after_lesson">After a specific lesson is completed</option>
          <option value="after_quiz">After passing a quiz</option>
          <option value="min_level">Minimum student level</option>
          <option value="date">Scheduled date / time</option>
        </select>
      </div>

      {/* Specific Lesson Selector */}
      {activeType === 'after_lesson' && value?.type === 'after_lesson' && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          <label htmlFor="select-prereq-lesson" className="block text-xs font-medium text-slate-600">
            Prerequisite Lesson
          </label>
          {lessonsForSelect.length > 0 ? (
            <select
              id="select-prereq-lesson"
              aria-label="Prerequisite lesson"
              value={value.lessonId}
              onChange={(e) => onChange({ type: 'after_lesson', lessonId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {lessonsForSelect.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              No previous lessons found in this course to select.
            </p>
          )}
        </div>
      )}

      {/* Quiz Requirement Selector */}
      {activeType === 'after_quiz' && value?.type === 'after_quiz' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="space-y-1.5">
            <label htmlFor="select-prereq-quiz" className="block text-xs font-medium text-slate-600">
              Required Quiz
            </label>
            {quizzesForSelect.length > 0 ? (
              <select
                id="select-prereq-quiz"
                aria-label="Required quiz"
                value={value.itemId}
                onChange={(e) => onChange({ ...value, itemId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {quizzesForSelect.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="select-prereq-quiz"
                aria-label="Quiz Item ID"
                type="text"
                placeholder="Enter Quiz Item ID"
                value={value.itemId}
                onChange={(e) => onChange({ ...value, itemId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="input-min-score" className="block text-xs font-medium text-slate-600">
              Passing Score Percentage (%)
            </label>
            <input
              id="input-min-score"
              aria-label="Passing score percentage"
              type="number"
              min={0}
              max={100}
              value={value.minScore ?? 80}
              onChange={(e) => onChange({ ...value, minScore: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      )}

      {/* Minimum Level Input */}
      {activeType === 'min_level' && value?.type === 'min_level' && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          <label htmlFor="input-min-level" className="block text-xs font-medium text-slate-600">
            Required Student Level
          </label>
          <input
            id="input-min-level"
            aria-label="Required student level"
            type="number"
            min={1}
            value={value.level ?? 1}
            onChange={(e) => onChange({ type: 'min_level', level: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      )}

      {/* Date Picker Input */}
      {activeType === 'date' && value?.type === 'date' && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          <label htmlFor="input-unlock-date" className="block text-xs font-medium text-slate-600">
            Unlock Date &amp; Time
          </label>
          <input
            id="input-unlock-date"
            aria-label="Unlock date and time"
            type="datetime-local"
            value={value.at ? value.at.slice(0, 16) : ''}
            onChange={(e) => onChange({ type: 'date', at: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      )}

      {/* Plain-English Preview Card */}
      <div className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-950 shadow-2xs">
        {value === null ? (
          <Unlock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <span className="font-semibold text-indigo-900 block">Preview Rule:</span>
          <p className="text-slate-700 capitalize-first">{previewSentence}</p>
        </div>
      </div>
    </div>
  );
};
