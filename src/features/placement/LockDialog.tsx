import React, { useState, useEffect } from 'react';
import { Dialog } from '../../components/shared/Dialog';
import { Button } from '../../components/shared/Button';
import { LockEditor } from './LockEditor';
import { placementApi } from './api';
import type { LockRule, LockState, LockEntity } from '../../../shared/classroom/types';
import { Lock, Loader2 } from 'lucide-react';

export interface ClassroomEditLockEventDetail {
  courseId?: string;
  entityType: LockEntity;
  entityId: string;
  current: LockState | null;
}

export const LockDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [detail, setDetail] = useState<ClassroomEditLockEventDetail | null>(null);
  const [rule, setRule] = useState<LockRule | null>(null);
  const [message, setMessage] = useState<string>('');
  const [lessonsForSelect, setLessonsForSelect] = useState<{ id: string; title: string }[]>([]);
  const [quizzesForSelect, setQuizzesForSelect] = useState<{ id: string; title: string }[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEditLock = (e: Event) => {
      const customEvent = e as CustomEvent<ClassroomEditLockEventDetail>;
      if (!customEvent.detail) return;

      const evtDetail = customEvent.detail;
      setDetail(evtDetail);
      setRule(evtDetail.current?.rule || null);
      setMessage(evtDetail.current?.message || '');
      setError(null);
      setIsOpen(true);

      // Fetch classroom tree to gather dropdown options for lessons & quizzes
      setIsLoadingTree(true);
      placementApi
        .getTree()
        .then((res) => {
          const courses = res.courses || [];
          const lessons: { id: string; title: string }[] = [];
          const quizzes: { id: string; title: string }[] = [];

          // Find course or include all lessons/quizzes
          const targetCourses = evtDetail.courseId
            ? courses.filter((c) => c.id === evtDetail.courseId)
            : courses;

          for (const course of targetCourses.length ? targetCourses : courses) {
            for (const mod of course.modules || []) {
              for (const les of mod.lessons || []) {
                lessons.push({
                  id: les.id,
                  title: `${course.courseCode || course.title} > ${mod.title} > ${les.title}`,
                });
                if (les.quizzes) {
                  for (const q of les.quizzes) {
                    quizzes.push({ id: q.id, title: q.title });
                  }
                }
              }
            }
          }

          setLessonsForSelect(lessons);
          setQuizzesForSelect(quizzes);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load options for lock configuration.');
        })
        .finally(() => {
          setIsLoadingTree(false);
        });
    };

    window.addEventListener('classroom:edit-lock', handleEditLock);
    return () => {
      window.removeEventListener('classroom:edit-lock', handleEditLock);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setDetail(null);
    setRule(null);
    setMessage('');
    setError(null);
  };

  const handleSave = async () => {
    if (!detail) return;
    setIsSaving(true);
    setError(null);

    try {
      if (rule === null) {
        await placementApi.removeLock(detail.entityType, detail.entityId);
      } else {
        await placementApi.setLock(detail.entityType, detail.entityId, rule, message || undefined);
      }

      // Dispatch refresh event to update Classroom UI
      window.dispatchEvent(new CustomEvent('classroom:refresh'));
      handleClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save lock settings.';
      setError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !detail) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-slate-900">
          <Lock className="w-5 h-5 text-indigo-600" />
          <span>Edit Lock Rules ({detail.entityType})</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-5">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
            {error}
          </div>
        )}

        {isLoadingTree ? (
          <div className="flex items-center justify-center py-8 text-slate-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading course data...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <LockEditor
              value={rule}
              onChange={setRule}
              lessonsForSelect={lessonsForSelect}
              quizzesForSelect={quizzesForSelect}
            />

            {rule !== null && (
              <div className="space-y-1">
                <label htmlFor="input-lock-custom-message" className="block text-xs font-medium text-slate-600">
                  Custom Lock Message for Students (Optional)
                </label>
                <input
                  id="input-lock-custom-message"
                  type="text"
                  placeholder="e.g. This section requires completing previous lessons first."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
            Save Lock Rules
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
