import React, { useState, useEffect } from 'react';
import type { ItemKind, ItemSlot, PlacementTarget } from '../../../shared/classroom/types';
import { X, MapPin } from 'lucide-react';

export interface PlacementPickerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: Partial<PlacementTarget>;
  allowedKinds?: ItemKind[];
  title?: string;
  onConfirm: (target: PlacementTarget) => void;
}

const ALL_KINDS: ItemKind[] = [
  'reading', 'quiz', 'flashcards', 'video', 'audio', 'pdf', 'image', 'resource', 'worksheet', 'lesson_plan'
];

export const PlacementPicker: React.FC<PlacementPickerProps> = ({
  isOpen,
  onClose,
  defaultTarget,
  allowedKinds = ALL_KINDS,
  title = 'Select Placement',
  onConfirm,
}) => {
  const [courseId, setCourseId] = useState(defaultTarget?.courseId || 'course-1');
  const [moduleId, setModuleId] = useState<string>(defaultTarget?.moduleId || 'm1');
  const [newModuleTitle, setNewModuleTitle] = useState(defaultTarget?.newModuleTitle || '');
  const [lessonId, setLessonId] = useState<string>(defaultTarget?.lessonId || 'l1');
  const [newLessonTitle, setNewLessonTitle] = useState(defaultTarget?.newLessonTitle || '');
  const [kind, setKind] = useState<ItemKind>(defaultTarget?.kind || allowedKinds[0] || 'reading');
  const [slot, setSlot] = useState<ItemSlot>(defaultTarget?.slot || 'main');

  useEffect(() => {
    if (defaultTarget) {
      if (defaultTarget.courseId) setCourseId(defaultTarget.courseId);
      if (defaultTarget.moduleId) setModuleId(defaultTarget.moduleId);
      if (defaultTarget.newModuleTitle) setNewModuleTitle(defaultTarget.newModuleTitle);
      if (defaultTarget.lessonId) setLessonId(defaultTarget.lessonId);
      if (defaultTarget.newLessonTitle) setNewLessonTitle(defaultTarget.newLessonTitle);
      if (defaultTarget.kind && allowedKinds.includes(defaultTarget.kind)) setKind(defaultTarget.kind);
      if (defaultTarget.slot) setSlot(defaultTarget.slot);
    }
  }, [defaultTarget, allowedKinds]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target: PlacementTarget = {
      courseId,
      moduleId,
      ...(moduleId === 'new' ? { newModuleTitle: newModuleTitle || 'New Module' } : {}),
      lessonId,
      ...(lessonId === 'new' ? { newLessonTitle: newLessonTitle || 'New Lesson' } : {}),
      kind,
      slot,
    };
    onConfirm(target);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Course ID</label>
            <input
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Module</label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="m1">Module 1 (Default)</option>
                <option value="m2">Module 2</option>
                <option value="new">+ Create New Module</option>
              </select>
            </div>

            {moduleId === 'new' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Module Title</label>
                <input
                  type="text"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Introduction"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lesson</label>
              <select
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="l1">Lesson 1 (Default)</option>
                <option value="l2">Lesson 2</option>
                <option value="new">+ Create New Lesson</option>
              </select>
            </div>

            {lessonId === 'new' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Lesson Title</label>
                <input
                  type="text"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="e.g. Overview"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Material Type (Kind)</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ItemKind)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {allowedKinds.map((k) => (
                  <option key={k} value={k}>
                    {k.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Slot</label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as ItemSlot)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="main">Main Content</option>
                <option value="section">Section</option>
                <option value="resource">Resource / Attachment</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Confirm Placement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlacementPicker;
