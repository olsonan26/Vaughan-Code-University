import React from 'react';
import type { LockRule } from '../../../shared/classroom/types';
import { Lock } from 'lucide-react';

export interface LockEditorProps {
  value: LockRule;
  onChange: (rule: LockRule) => void;
  lessonsForSelect?: { id: string; title: string }[];
  quizzesForSelect?: { id: string; title: string }[];
}

export const LockEditor: React.FC<LockEditorProps> = ({
  value,
  onChange,
  lessonsForSelect = [],
  quizzesForSelect = [],
}) => {
  const currentType = value.type;

  const handleTypeChange = (newType: LockRule['type']) => {
    switch (newType) {
      case 'manual':
        onChange({ type: 'manual' });
        break;
      case 'after_previous':
        onChange({ type: 'after_previous' });
        break;
      case 'after_lesson':
        onChange({ type: 'after_lesson', lessonId: lessonsForSelect[0]?.id || '' });
        break;
      case 'after_quiz':
        onChange({ type: 'after_quiz', itemId: quizzesForSelect[0]?.id || '', minScore: 80 });
        break;
      case 'min_level':
        onChange({ type: 'min_level', level: 2 });
        break;
      case 'date':
        onChange({ type: 'date', at: new Date().toISOString() });
        break;
    }
  };

  return (
    <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/80 space-y-3 text-xs">
      <div className="flex items-center gap-2 font-semibold text-slate-800">
        <Lock className="w-4 h-4 text-amber-600" />
        <span>Lock Rule</span>
      </div>

      <div>
        <label className="block text-slate-600 mb-1 font-medium">Rule Type</label>
        <select
          value={currentType}
          onChange={(e) => handleTypeChange(e.target.value as LockRule['type'])}
          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="after_previous">Unlocked after previous item complete</option>
          <option value="manual">Manually locked (instructor unlocks)</option>
          <option value="after_lesson">Unlocked after completing specific lesson</option>
          <option value="after_quiz">Unlocked after passing quiz (min score)</option>
          <option value="min_level">Unlocked at student level</option>
          <option value="date">Unlocked at specific date/time</option>
        </select>
      </div>

      {currentType === 'after_lesson' && (
        <div>
          <label className="block text-slate-600 mb-1 font-medium font-semibold">Prerequisite Lesson</label>
          {lessonsForSelect.length > 0 ? (
            <select
              value={(value as { type: 'after_lesson'; lessonId: string }).lessonId}
              onChange={(e) => onChange({ type: 'after_lesson', lessonId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
            >
              {lessonsForSelect.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Lesson ID"
              value={(value as { type: 'after_lesson'; lessonId: string }).lessonId || ''}
              onChange={(e) => onChange({ type: 'after_lesson', lessonId: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
            />
          )}
        </div>
      )}

      {currentType === 'after_quiz' && (
        <div className="space-y-2">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">Prerequisite Quiz</label>
            {quizzesForSelect.length > 0 ? (
              <select
                value={(value as { type: 'after_quiz'; itemId: string; minScore: number }).itemId}
                onChange={(e) =>
                  onChange({
                    type: 'after_quiz',
                    itemId: e.target.value,
                    minScore: (value as { type: 'after_quiz'; itemId: string; minScore: number }).minScore || 80,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                {quizzesForSelect.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Quiz Item ID"
                value={(value as { type: 'after_quiz'; itemId: string; minScore: number }).itemId || ''}
                onChange={(e) =>
                  onChange({
                    type: 'after_quiz',
                    itemId: e.target.value,
                    minScore: (value as { type: 'after_quiz'; itemId: string; minScore: number }).minScore || 80,
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            )}
          </div>
          <div>
            <label className="block text-slate-600 mb-1 font-medium">Minimum Score (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={(value as { type: 'after_quiz'; itemId: string; minScore: number }).minScore || 80}
              onChange={(e) =>
                onChange({
                  type: 'after_quiz',
                  itemId: (value as { type: 'after_quiz'; itemId: string; minScore: number }).itemId || '',
                  minScore: Number(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>
        </div>
      )}

      {currentType === 'min_level' && (
        <div>
          <label className="block text-slate-600 mb-1 font-medium">Minimum Student Level</label>
          <input
            type="number"
            min="1"
            value={(value as { type: 'min_level'; level: number }).level || 1}
            onChange={(e) => onChange({ type: 'min_level', level: Number(e.target.value) || 1 })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
          />
        </div>
      )}

      {currentType === 'date' && (
        <div>
          <label className="block text-slate-600 mb-1 font-medium">Unlock Date & Time</label>
          <input
            type="datetime-local"
            value={
              (value as { type: 'date'; at: string }).at
                ? new Date((value as { type: 'date'; at: string }).at).toISOString().slice(0, 16)
                : ''
            }
            onChange={(e) =>
              onChange({ type: 'date', at: new Date(e.target.value).toISOString() })
            }
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
          />
        </div>
      )}
    </div>
  );
};

export default LockEditor;
