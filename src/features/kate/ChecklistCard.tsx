import React, { useState } from 'react';
import type { KateChecklist, KateSuggestion, ChangeSetView, GeneratorInput } from '../../../shared/kate/types';
import type { PlacementTarget, ItemKind } from '../../../shared/classroom/types';
import { groupChecklistSuggestions } from './kateHelpers';
import { generateContent } from './api';
import { getJob } from '../jobs/api';
import { PlacementPicker } from './placement';
import { ChangeSetCard } from './ChangeSetCard';

import {
  ListChecks,
  Check,
  Sparkles,
  ArrowRight,
  Info,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export interface ChecklistCardProps {
  checklist: KateChecklist;
  threadId?: string;
  courseId?: string;
  onGenerated?: (changeSets: ChangeSetView[]) => void;
}

interface ItemExecutionState {
  suggestion: KateSuggestion;
  status: 'idle' | 'pending_placement' | 'generating' | 'polling' | 'completed' | 'error';
  progress?: number;
  errorMessage?: string;
  changeSet?: ChangeSetView;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  checklist,
  threadId,
  courseId = 'course-1',
  onGenerated,
}) => {
  const { fromSource, beyondSource } = groupChecklistSuggestions(checklist.suggestions || []);

  // Track checked states by suggestion ID
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of checklist.suggestions || []) {
      initial[item.id] = item.defaultChecked ?? item.fromSource;
    }
    return initial;
  });

  const [executionQueue, setExecutionQueue] = useState<ItemExecutionState[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number | null>(null);
  const [placementPickerOpen, setPlacementPickerOpen] = useState<boolean>(false);
  const [generatedChangeSets, setGeneratedChangeSets] = useState<ChangeSetView[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartExecution = () => {
    const selected = (checklist.suggestions || []).filter((item) => checkedIds[item.id]);
    if (selected.length === 0) return;

    const queue: ItemExecutionState[] = selected.map((s) => ({
      suggestion: s,
      status: 'idle',
    }));

    setExecutionQueue(queue);
    setIsProcessing(true);
    // Start first item
    startQueueItem(0, queue);
  };

  const startQueueItem = (index: number, currentQueue: ItemExecutionState[]) => {
    if (index >= currentQueue.length) {
      setIsProcessing(false);
      setActiveQueueIndex(null);
      return;
    }

    setActiveQueueIndex(index);
    const updated = [...currentQueue];
    updated[index] = { ...updated[index], status: 'pending_placement' };
    setExecutionQueue(updated);
    setPlacementPickerOpen(true);
  };

  const handlePlacementConfirm = async (target: PlacementTarget) => {
    setPlacementPickerOpen(false);
    if (activeQueueIndex === null) return;

    const currentItem = executionQueue[activeQueueIndex];
    if (!currentItem) return;

    // Update status to generating
    const updatedQueue = [...executionQueue];
    updatedQueue[activeQueueIndex] = {
      ...currentItem,
      status: 'generating',
      progress: 10,
    };
    setExecutionQueue(updatedQueue);

    const isBeyond = !currentItem.suggestion.fromSource;
    const input: GeneratorInput = {
      organizationId: 'default',
      userId: 'me',
      courseId: courseId || target.courseId || 'course-1',
      sourceIds: checklist.sourceIds || [],
      instruction: currentItem.suggestion.why,
      placement: target,
      allowBeyondSource: isBeyond,
      approvedAdditions: isBeyond ? [currentItem.suggestion.title] : undefined,
    };

    try {
      const res = await generateContent({
        action: currentItem.suggestion.action,
        input,
        threadId,
      });

      if (res.changeSet) {
        handleItemSuccess(activeQueueIndex, res.changeSet, updatedQueue);
      } else if (res.jobId) {
        // Poll job
        pollJobProgress(res.jobId, activeQueueIndex, updatedQueue);
      } else {
        handleItemError(activeQueueIndex, 'No output received from generation', updatedQueue);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      handleItemError(activeQueueIndex, message, updatedQueue);
    }
  };

  const pollJobProgress = async (jobId: string, index: number, queue: ItemExecutionState[]) => {
    const updateStatus = (progress: number, status: ItemExecutionState['status']) => {
      const copy = [...queue];
      if (copy[index]) {
        copy[index] = { ...copy[index], progress, status };
        setExecutionQueue(copy);
      }
    };

    updateStatus(20, 'polling');

    const interval = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        if (job.state === 'completed') {
          clearInterval(interval);
          const cs = job.result?.changeSet as ChangeSetView | undefined;
          if (cs) {
            handleItemSuccess(index, cs, queue);
          } else {
            handleItemError(index, 'Job completed without returning a change set', queue);
          }
        } else if (job.state === 'failed' || job.state === 'cancelled') {
          clearInterval(interval);
          handleItemError(index, job.error || 'Job failed', queue);
        } else {
          updateStatus(Math.min(90, (job.progress || 0) + 20), 'polling');
        }
      } catch {
        // Keep retrying
      }
    }, 2000);
  };

  const handleItemSuccess = (
    index: number,
    changeSet: ChangeSetView,
    queue: ItemExecutionState[]
  ) => {
    const updated = [...queue];
    updated[index] = {
      ...updated[index],
      status: 'completed',
      progress: 100,
      changeSet,
    };
    setExecutionQueue(updated);

    const newChangeSets = [...generatedChangeSets, changeSet];
    setGeneratedChangeSets(newChangeSets);
    if (onGenerated) onGenerated(newChangeSets);

    // Proceed to next queue item
    startQueueItem(index + 1, updated);
  };

  const handleItemError = (
    index: number,
    errorMessage: string,
    queue: ItemExecutionState[]
  ) => {
    const updated = [...queue];
    updated[index] = {
      ...updated[index],
      status: 'error',
      errorMessage,
    };
    setExecutionQueue(updated);

    // Proceed to next item despite error
    startQueueItem(index + 1, updated);
  };

  const currentActiveSuggestion =
    activeQueueIndex !== null ? executionQueue[activeQueueIndex]?.suggestion : null;

  return (
    <div className="my-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-indigo-600" />
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Kate's Content Suggestions</h4>
            <p className="text-slate-600 text-[11px]">{checklist.summary || 'Recommended actions based on source analysis'}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* From Your Source */}
        {fromSource.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>From Your Source</span>
            </h5>
            <div className="space-y-1.5">
              {fromSource.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedIds[item.id]}
                    onChange={() => toggleCheck(item.id)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    <div className="text-slate-500 text-[11px]">{item.why}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Beyond Your Source */}
        {beyondSource.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Beyond Your Source (Enrichment)</span>
            </h5>
            <div className="space-y-1.5">
              {beyondSource.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/30 hover:border-amber-300 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedIds[item.id]}
                    onChange={() => toggleCheck(item.id)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                  />
                  <div>
                    <div className="font-semibold text-amber-950">{item.title}</div>
                    <div className="text-amber-800/80 text-[11px]">{item.why}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 text-[11px]">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                These add information that is not in your upload. Kate will mark them as your approved additions.
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!isProcessing && executionQueue.length === 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartExecution}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Do the checked items</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Progress Queue status */}
        {executionQueue.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h6 className="font-bold text-slate-800">Generation Progress</h6>
            <div className="space-y-2">
              {executionQueue.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-white border border-slate-200">
                  <span className="font-medium text-slate-800">{item.suggestion.title}</span>
                  <div className="flex items-center gap-2">
                    {item.status === 'generating' || item.status === 'polling' ? (
                      <span className="text-indigo-600 font-semibold flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating ({item.progress || 0}%)
                      </span>
                    ) : item.status === 'pending_placement' ? (
                      <span className="text-amber-600 font-semibold">Select placement...</span>
                    ) : item.status === 'completed' ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Done
                      </span>
                    ) : item.status === 'error' ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Error
                      </span>
                    ) : (
                      <span className="text-slate-400">Waiting...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generated Change Sets Output */}
      {generatedChangeSets.length > 0 && (
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
          <h5 className="font-bold text-slate-900">Generated Change Sets</h5>
          {generatedChangeSets.map((cs) => (
            <ChangeSetCard key={cs.id} changeSet={cs} />
          ))}
        </div>
      )}

      {/* Placement Picker Modal for active queue item */}
      {placementPickerOpen && currentActiveSuggestion && (
        <PlacementPicker
          isOpen={placementPickerOpen}
          onClose={() => setPlacementPickerOpen(false)}
          title={`Place Content: ${currentActiveSuggestion.title}`}
          defaultTarget={
            currentActiveSuggestion.suggestedPlacement || {
              courseId,
              moduleId: 'm1',
              lessonId: 'l1',
              kind: (currentActiveSuggestion.outputKind === 'module' || currentActiveSuggestion.outputKind === 'lesson' || currentActiveSuggestion.outputKind === 'course')
                ? 'reading'
                : (currentActiveSuggestion.outputKind as ItemKind),
              slot: 'main',
            }
          }
          allowedKinds={
            (currentActiveSuggestion.outputKind === 'module' || currentActiveSuggestion.outputKind === 'lesson' || currentActiveSuggestion.outputKind === 'course')
              ? undefined
              : [currentActiveSuggestion.outputKind as ItemKind]
          }
          onConfirm={handlePlacementConfirm}
        />
      )}
    </div>
  );
};

export default ChecklistCard;
