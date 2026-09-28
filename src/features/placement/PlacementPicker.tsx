import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from '../../components/shared/Dialog';
import { Button } from '../../components/shared/Button';
import { placementApi, StudioTreeCourse, StudioTreeLesson, StudioTreeQuiz } from './api';
import { LockEditor } from './LockEditor';
import { buildPlacementBreadcrumb, ITEM_KIND_LABELS } from './utils';
import type { PlacementTarget, LockRule, ItemKind, ItemSlot } from '../../../shared/classroom/types';
import { ChevronRight, Check, Plus, FolderPlus, FilePlus, Layers, Lock, MapPin } from 'lucide-react';

export interface PlacementPickerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: Partial<PlacementTarget>;
  allowedKinds?: ItemKind[];
  title?: string;
  onConfirm: (target: PlacementTarget) => void;
}

const ALL_KINDS: ItemKind[] = [
  'video',
  'audio',
  'pdf',
  'reading',
  'image',
  'quiz',
  'resource',
  'flashcards',
  'worksheet',
  'lesson_plan',
];

export const PlacementPicker: React.FC<PlacementPickerProps> = ({
  isOpen,
  onClose,
  defaultTarget,
  allowedKinds = ALL_KINDS,
  title = 'Choose Placement Target',
  onConfirm,
}) => {
  const [courses, setCourses] = useState<StudioTreeCourse[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Current target state
  const [courseId, setCourseId] = useState<string>('');
  const [moduleId, setModuleId] = useState<string | 'new'>('');
  const [newModuleTitle, setNewModuleTitle] = useState<string>('');
  const [lessonId, setLessonId] = useState<string | 'new'>('');
  const [newLessonTitle, setNewLessonTitle] = useState<string>('');
  const [kind, setKind] = useState<ItemKind>(allowedKinds[0] || 'reading');
  const [slot, setSlot] = useState<ItemSlot>('main');
  const [positionMode, setPositionMode] = useState<'end' | 'after'>('end');
  const [afterItemId, setAfterItemId] = useState<string>('');
  const [lockRule, setLockRule] = useState<LockRule | null>(null);
  const [lockMessage, setLockMessage] = useState<string>('');

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Available kinds filtered by allowedKinds
  const availableKinds = useMemo(() => {
    return ALL_KINDS.filter((k) => allowedKinds.includes(k));
  }, [allowedKinds]);

  // Load classroom tree when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingTree(true);
      setTreeError(null);
      placementApi
        .getTree()
        .then((res) => {
          const loadedCourses = res.courses || [];
          setCourses(loadedCourses);

          // Apply defaults or initial tree state
          const initialCourseId = defaultTarget?.courseId || loadedCourses[0]?.id || '';
          setCourseId(initialCourseId);

          const matchedCourse = loadedCourses.find((c) => c.id === initialCourseId);
          const initialModuleId = defaultTarget?.moduleId || matchedCourse?.modules[0]?.id || '';
          setModuleId(initialModuleId);
          setNewModuleTitle(defaultTarget?.newModuleTitle || '');

          const matchedModule = matchedCourse?.modules.find((m) => m.id === initialModuleId);
          const initialLessonId = defaultTarget?.lessonId || matchedModule?.lessons[0]?.id || '';
          setLessonId(initialLessonId);
          setNewLessonTitle(defaultTarget?.newLessonTitle || '');

          const initialKind = defaultTarget?.kind && allowedKinds.includes(defaultTarget.kind)
            ? defaultTarget.kind
            : allowedKinds[0] || 'reading';
          setKind(initialKind);

          setSlot(defaultTarget?.slot || 'main');
          setLockRule(defaultTarget?.lock?.rule || null);
          setLockMessage(defaultTarget?.lock?.message || '');

          // Calculate initial unanswered step
          let step = 1;
          if (defaultTarget?.courseId) {
            step = 2;
            if (
              defaultTarget?.moduleId &&
              (defaultTarget.moduleId !== 'new' || defaultTarget.newModuleTitle)
            ) {
              step = 3;
              if (
                defaultTarget?.lessonId &&
                (defaultTarget.lessonId !== 'new' || defaultTarget.newLessonTitle)
              ) {
                step = 4;
                if (defaultTarget?.kind) {
                  step = 5;
                }
              }
            }
          }
          setCurrentStep(step);
        })
        .catch((err) => {
          setTreeError(err.message || 'Failed to load classroom structure.');
        })
        .finally(() => {
          setIsLoadingTree(false);
        });
    }
  }, [isOpen, defaultTarget, allowedKinds]);

  // Selected Course / Module / Lesson objects from state
  const selectedCourse = useMemo(() => {
    return courses.find((c) => c.id === courseId);
  }, [courses, courseId]);

  const selectedModule = useMemo(() => {
    return selectedCourse?.modules.find((m) => m.id === moduleId);
  }, [selectedCourse, moduleId]);

  const selectedLesson = useMemo(() => {
    return selectedModule?.lessons.find((l) => l.id === lessonId);
  }, [selectedModule, lessonId]);

  // Extract all lessons and quizzes in current course for LockEditor
  const lessonsForSelect = useMemo(() => {
    if (!selectedCourse) return [];
    const items: { id: string; title: string }[] = [];
    for (const mod of selectedCourse.modules || []) {
      for (const les of mod.lessons || []) {
        items.push({ id: les.id, title: `${mod.title} > ${les.title}` });
      }
    }
    return items;
  }, [selectedCourse]);

  const quizzesForSelect = useMemo(() => {
    if (!selectedCourse) return [];
    const items: { id: string; title: string }[] = [];
    for (const mod of selectedCourse.modules || []) {
      for (const les of mod.lessons || []) {
        if (les.quizzes) {
          for (const q of les.quizzes) {
            items.push({ id: q.id, title: q.title });
          }
        }
      }
    }
    return items;
  }, [selectedCourse]);

  // Handle course change
  const handleCourseChange = (id: string) => {
    setCourseId(id);
    const newCourse = courses.find((c) => c.id === id);
    const firstMod = newCourse?.modules[0]?.id || '';
    setModuleId(firstMod);
    const firstLes = newCourse?.modules[0]?.lessons[0]?.id || '';
    setLessonId(firstLes);
  };

  // Handle module change
  const handleModuleChange = (id: string | 'new') => {
    setModuleId(id);
    if (id === 'new') {
      setLessonId('new');
    } else {
      const newMod = selectedCourse?.modules.find((m) => m.id === id);
      setLessonId(newMod?.lessons[0]?.id || 'new');
    }
  };

  // Construct target for breadcrumb & confirmation
  const constructedTarget: PlacementTarget = useMemo(() => {
    let computedPos: number | undefined = undefined;
    if (positionMode === 'after' && afterItemId && selectedLesson?.items) {
      const itemIdx = selectedLesson.items.findIndex((i) => i.id === afterItemId);
      if (itemIdx !== -1) {
        computedPos = selectedLesson.items[itemIdx].position + 1;
      }
    }

    return {
      courseId,
      moduleId,
      newModuleTitle: moduleId === 'new' ? newModuleTitle : undefined,
      lessonId,
      newLessonTitle: lessonId === 'new' ? newLessonTitle : undefined,
      kind,
      slot,
      position: computedPos,
      lock: lockRule ? { rule: lockRule, message: lockMessage || undefined } : null,
    };
  }, [
    courseId,
    moduleId,
    newModuleTitle,
    lessonId,
    newLessonTitle,
    kind,
    slot,
    positionMode,
    afterItemId,
    selectedLesson,
    lockRule,
    lockMessage,
  ]);

  const breadcrumbText = useMemo(() => {
    return buildPlacementBreadcrumb(constructedTarget, { courses });
  }, [constructedTarget, courses]);

  // Validation
  const isValidToConfirm = useMemo(() => {
    if (!courseId) return false;
    if (!moduleId) return false;
    if (moduleId === 'new' && !newModuleTitle.trim()) return false;
    if (!lessonId) return false;
    if (lessonId === 'new' && !newLessonTitle.trim()) return false;
    if (!kind) return false;
    return true;
  }, [courseId, moduleId, newModuleTitle, lessonId, newLessonTitle, kind]);

  const handleConfirm = () => {
    if (!isValidToConfirm) return;
    onConfirm(constructedTarget);
  };

  const steps = [
    { num: 1, label: 'Course' },
    { num: 2, label: 'Module' },
    { num: 3, label: 'Lesson' },
    { num: 4, label: 'Spot & Type' },
    { num: 5, label: 'Locking' },
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} maxWidth="xl">
      <div className="space-y-5">
        {/* Step Indicator / Stepper */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            return (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg px-2 py-1 ${
                    isActive
                      ? 'text-indigo-600 font-semibold bg-indigo-50'
                      : isCompleted
                      ? 'text-slate-700 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : isCompleted
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : step.num}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Error message */}
        {treeError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
            {treeError}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[220px]">
          {isLoadingTree ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              Loading course tree...
            </div>
          ) : (
            <>
              {/* STEP 1: Course Selection */}
              {currentStep === 1 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <label htmlFor="select-target-course" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Select Target Course
                  </label>
                  {courses.length === 0 ? (
                    <p className="text-sm text-slate-500">No courses available.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {courses.map((course) => {
                        const isSelected = course.id === courseId;
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => handleCourseChange(course.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                              {course.courseCode || 'COURSE'}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 block mt-0.5">
                              {course.title}
                            </span>
                            <span className="text-xs text-slate-500 block mt-1">
                              {course.modules?.length || 0} Modules
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Module Selection */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <label htmlFor="select-target-module" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Select or Create Module
                  </label>
                  <div className="space-y-2">
                    {selectedCourse?.modules.map((mod) => (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          moduleId === mod.id
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="module-choice"
                          value={mod.id}
                          checked={moduleId === mod.id}
                          onChange={() => handleModuleChange(mod.id)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-900">
                            {mod.title}
                          </span>
                          <span className="text-xs text-slate-500 block">
                            {mod.lessons?.length || 0} Lessons
                          </span>
                        </div>
                      </label>
                    ))}

                    {/* New Module Choice */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        moduleId === 'new'
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="module-choice"
                        value="new"
                        checked={moduleId === 'new'}
                        onChange={() => handleModuleChange('new')}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-1.5 font-medium text-sm text-indigo-700">
                          <FolderPlus className="w-4 h-4" />
                          <span>+ New Module</span>
                        </div>
                        {moduleId === 'new' && (
                          <input
                            type="text"
                            placeholder="Enter new module title..."
                            value={newModuleTitle}
                            onChange={(e) => setNewModuleTitle(e.target.value)}
                            autoFocus
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: Lesson Selection */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <label htmlFor="select-target-lesson" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Select or Create Lesson
                  </label>
                  <div className="space-y-2">
                    {moduleId !== 'new' &&
                      selectedModule?.lessons.map((les) => (
                        <label
                          key={les.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            lessonId === les.id
                              ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="lesson-choice"
                            value={les.id}
                            checked={lessonId === les.id}
                            onChange={() => setLessonId(les.id)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-900">
                              {les.title}
                            </span>
                            {les.itemCount !== undefined && (
                              <span className="text-xs text-slate-500 block">
                                {les.itemCount} items
                              </span>
                            )}
                          </div>
                        </label>
                      ))}

                    {/* New Lesson Choice */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        lessonId === 'new'
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="lesson-choice"
                        value="new"
                        checked={lessonId === 'new'}
                        onChange={() => setLessonId('new')}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-1.5 font-medium text-sm text-indigo-700">
                          <FilePlus className="w-4 h-4" />
                          <span>+ New Lesson</span>
                        </div>
                        {lessonId === 'new' && (
                          <input
                            type="text"
                            placeholder="Enter new lesson title..."
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            autoFocus
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 4: Spot (Kind, Slot, Position) */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Kind Selector */}
                  <div className="space-y-1.5">
                    <label htmlFor="select-item-kind" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Item Type
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableKinds.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setKind(k)}
                          className={`p-2.5 text-xs font-medium rounded-xl border text-center transition-all ${
                            kind === k
                              ? 'border-indigo-600 bg-indigo-60 text-white font-semibold shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                          style={
                            kind === k
                              ? { backgroundColor: '#4f46e5', color: '#ffffff' }
                              : {}
                          }
                        >
                          {ITEM_KIND_LABELS[k] || k}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slot Selector */}
                  <div className="space-y-1.5">
                    <label htmlFor="select-item-slot" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Placement Slot
                    </label>
                    <div className="flex gap-2">
                      {(['main', 'section', 'resource'] as ItemSlot[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSlot(s)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-xl border text-center transition-all capitalize ${
                            slot === s
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position Selector (End vs After specific item) */}
                  {selectedLesson?.items && selectedLesson.items.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label htmlFor="select-position" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Insert Position
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPositionMode('end')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                            positionMode === 'end'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          At End of Lesson
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPositionMode('after');
                            if (!afterItemId && selectedLesson.items?.[0]) {
                              setAfterItemId(selectedLesson.items[0].id);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                            positionMode === 'after'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          After Existing Item
                        </button>
                      </div>

                      {positionMode === 'after' && (
                        <select
                          aria-label="After existing item"
                          value={afterItemId}
                          onChange={(e) => setAfterItemId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none"
                        >
                          {selectedLesson.items.map((item) => (
                            <option key={item.id} value={item.id}>
                              After: {item.title || `${ITEM_KIND_LABELS[item.kind]} #${item.position}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Lock Configuration */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <LockEditor
                    value={lockRule}
                    onChange={setLockRule}
                    lessonsForSelect={lessonsForSelect}
                    quizzesForSelect={quizzesForSelect}
                  />

                  {lockRule && (
                    <div className="space-y-1">
                      <label htmlFor="input-lock-message" className="block text-xs font-medium text-slate-600">
                        Custom Lock Message (Optional)
                      </label>
                      <input
                        id="input-lock-message"
                        type="text"
                        placeholder="e.g. Complete earlier assignments before viewing this material."
                        value={lockMessage}
                        onChange={(e) => setLockMessage(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Breadcrumb Preview */}
        <div className="rounded-xl bg-slate-100/80 p-3 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900 block">Placement Summary:</span>
            <span className="font-mono text-slate-800 break-all">{breadcrumbText}</span>
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                onClose();
              }
            }}
          >
            {currentStep > 1 ? 'Back' : 'Cancel'}
          </Button>

          <div className="flex gap-2">
            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={!isValidToConfirm}
                onClick={handleConfirm}
              >
                Confirm Placement
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};
