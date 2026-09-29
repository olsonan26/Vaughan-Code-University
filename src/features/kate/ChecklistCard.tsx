import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { KateChecklist, KateSuggestion, ChangeSetView, GeneratorInput } from '../../../shared/kate/types';
import type { PlacementTarget, ItemKind } from '../../../shared/classroom/types';
import { groupChecklistSuggestions } from './kateHelpers';
import { generateContent } from './api';
import { getJob } from '../jobs/api';
import { PlacementPicker } from './placement';

import {
  ListChecks,
  Check,
  Sparkles,
  ArrowRight,
  Info,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export interface ChecklistCardProps {
  checklist: KateChecklist;
  threadId?: string;
  courseId?: string;
  onGenerated?: (changeSets: ChangeSetView[]) => void;
}

interface ItemExecutionState {
  suggestion: KateSuggestion;
  status: 'pending_placement' | 'queued' | 'generating' | 'completed' | 'error' | 'skipped';
  target?: PlacementTarget;
  startedAt?: number;
  errorMessage?: string;
  changeSet?: ChangeSetView;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v?: string) => !!v && UUID.test(v);
const CONCURRENCY = 2;

function kindFor(s: KateSuggestion): ItemKind | undefined {
  return s.outputKind === 'module' || s.outputKind === 'lesson' || s.outputKind === 'course' ? undefined : (s.outputKind as ItemKind);
}

/** Only pass ids that really exist-looking; never invent module/lesson ids. */
function defaultTargetFor(s: KateSuggestion, courseId?: string): Partial<PlacementTarget> {
  const sp: any = s.suggestedPlacement ?? {};
  const t: any = {};
  const c = isUuid(sp.courseId) ? sp.courseId : isUuid(courseId) ? courseId : undefined;
  if (c) t.courseId = c;
  if (c && (isUuid(sp.moduleId) || sp.moduleId === 'new')) { t.moduleId = sp.moduleId; if (sp.newModuleTitle) t.newModuleTitle = sp.newModuleTitle; }
  if (t.moduleId && (isUuid(sp.lessonId) || sp.lessonId === 'new')) { t.lessonId = sp.lessonId; if (sp.newLessonTitle) t.newLessonTitle = sp.newLessonTitle; }
  const k = kindFor(s) ?? (sp.kind as ItemKind | undefined);
  if (k) t.kind = k;
  return t;
}

function friendlyError(err: unknown): string {
  const e: any = err;
  const code = e?.code ?? e?.body?.error?.code;
  const msg: string = e?.message ?? 'Kate could not finish this one.';
  if (code === 'validation_failed') return 'The placement was incomplete. Click Retry and pick the spot again.';
  if (e?.status === 403 || code === 'forbidden') return 'You are not on the team for that course, so Kate cannot add to it.';
  if (e?.status === 504 || /timed? ?out|FUNCTION_INVOCATION_TIMEOUT/i.test(msg)) return 'This took too long. Click Retry; Kate will try again.';
  if (/rate limit/i.test(msg)) return 'The AI service is busy right now. Click Retry in a minute.';
  if (/failed to fetch|network/i.test(msg)) return 'Connection dropped. Click Retry.';
  return msg;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({ checklist, threadId, courseId, onGenerated }) => {
  const { fromSource, beyondSource } = groupChecklistSuggestions(checklist.suggestions || []);

  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of checklist.suggestions || []) initial[item.id] = item.defaultChecked ?? item.fromSource;
    return initial;
  });

  const [executionQueue, setExecutionQueueState] = useState<ItemExecutionState[]>([]);
  const queueRef = useRef<ItemExecutionState[]>([]);
  const running = useRef(0);
  const [placingIndex, setPlacingIndex] = useState<number | null>(null);
  const [, tick] = useState(0);

  const setQueue = (fn: (q: ItemExecutionState[]) => ItemExecutionState[]) => {
    queueRef.current = fn(queueRef.current);
    setExecutionQueueState(queueRef.current);
  };
  const patch = (i: number, p: Partial<ItemExecutionState>) => setQueue((q) => q.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const anyGenerating = executionQueue.some((x) => x.status === 'generating' || x.status === 'queued');
  useEffect(() => {
    if (!anyGenerating) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [anyGenerating]);

  const toggleCheck = (id: string) => setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const nextToPlace = (q: ItemExecutionState[]) => q.findIndex((x) => x.status === 'pending_placement');

  const handleStartExecution = () => {
    const selected = (checklist.suggestions || []).filter((item) => checkedIds[item.id]);
    if (selected.length === 0) return;
    setQueue(() => selected.map((s) => ({ suggestion: s, status: 'pending_placement' })));
    setPlacingIndex(0);
  };

  const runOne = async (i: number) => {
    const item = queueRef.current[i];
    if (!item?.target) return;
    running.current += 1;
    patch(i, { status: 'generating', startedAt: Date.now(), errorMessage: undefined });
    const isBeyond = !item.suggestion.fromSource;
    const input = {
      courseId: item.target.courseId,
      sourceIds: checklist.sourceIds || [],
      instruction: `${item.suggestion.title}. ${item.suggestion.why}`.slice(0, 8000),
      placement: item.target,
      allowBeyondSource: isBeyond,
      approvedAdditions: isBeyond ? [item.suggestion.title] : undefined,
    } as unknown as GeneratorInput;
    try {
      const res = await generateContent({ action: item.suggestion.action, input, threadId });
      let cs = res.changeSet;
      if (!cs && res.jobId) cs = await waitForJob(res.jobId);
      if (!cs) throw new Error('Kate finished but returned nothing to review. Click Retry.');
      patch(i, { status: 'completed', changeSet: cs });
      onGenerated?.(queueRef.current.filter((x) => x.changeSet).map((x) => x.changeSet!));
    } catch (err) {
      patch(i, { status: 'error', errorMessage: friendlyError(err) });
    } finally {
      running.current -= 1;
      pump();
    }
  };

  const waitForJob = async (jobId: string): Promise<ChangeSetView | undefined> => {
    for (let n = 0; n < 300; n++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const job = await getJob(jobId);
        if (job.state === 'completed') return job.result?.changeSet as ChangeSetView | undefined;
        if (job.state === 'failed' || job.state === 'cancelled') throw new Error(job.error || 'Kate could not finish this one.');
      } catch (e: any) { if (e?.message && !/fetch|network/i.test(e.message)) throw e; }
    }
    throw new Error('This took too long. Click Retry.');
  };

  const pump = () => {
    const q = queueRef.current;
    for (let i = 0; i < q.length && running.current < CONCURRENCY; i++) {
      if (q[i].status === 'queued') void runOne(i);
    }
  };

  const handlePlacementConfirm = (target: PlacementTarget) => {
    const i = placingIndex;
    if (i === null) return;
    patch(i, { status: 'queued', target });
    const n = nextToPlace(queueRef.current);
    setPlacingIndex(n === -1 ? null : n);
    pump();
  };

  const handlePlacementClose = () => {
    const i = placingIndex;
    if (i !== null) patch(i, { status: 'skipped' });
    const n = nextToPlace(queueRef.current);
    setPlacingIndex(n === -1 ? null : n);
    pump();
  };

  const retry = (i: number) => { patch(i, { status: 'queued', errorMessage: undefined }); pump(); };
  const replace = (i: number) => { patch(i, { status: 'pending_placement', errorMessage: undefined }); setPlacingIndex(i); };

  const isProcessing = placingIndex !== null || anyGenerating;
  const currentActiveSuggestion = placingIndex !== null ? executionQueue[placingIndex]?.suggestion : null;
  // Stable objects: the picker re-initialises whenever these change identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const placingDefault = useMemo(() => (currentActiveSuggestion ? defaultTargetFor(currentActiveSuggestion, courseId) : undefined), [placingIndex]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const placingKinds = useMemo(() => { const k = currentActiveSuggestion ? kindFor(currentActiveSuggestion) : undefined; return k ? [k] : undefined; }, [placingIndex]);
  const elapsed = (x: ItemExecutionState) => (x.startedAt ? Math.round((Date.now() - x.startedAt) / 1000) : 0);
  const doneCount = executionQueue.filter((x) => x.status === 'completed').length;
  const errCount = executionQueue.filter((x) => x.status === 'error').length;

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
            <div className="flex items-center justify-between">
              <h6 className="font-bold text-slate-800">Progress</h6>
              <span className="text-[11px] text-slate-500">{doneCount} of {executionQueue.length} ready{errCount ? `, ${errCount} need a retry` : ''}</span>
            </div>
            {placingIndex !== null && <p className="text-[11px] text-slate-600">Pick where each item goes. Kate starts writing as soon as you place one, so you do not have to wait.</p>}
            <div className="space-y-2">
              {executionQueue.map((item, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{item.suggestion.title}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.status === 'generating' ? (
                        <span className="text-indigo-600 font-semibold flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" />Writing and checking ({elapsed(item)}s)</span>
                      ) : item.status === 'queued' ? (
                        <span className="text-slate-500">Up next</span>
                      ) : item.status === 'pending_placement' ? (
                        <span className="text-amber-600 font-semibold">{placingIndex === idx ? 'Choosing a spot...' : 'Needs a spot'}</span>
                      ) : item.status === 'completed' ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Ready to review below</span>
                      ) : item.status === 'skipped' ? (
                        <button type="button" onClick={() => replace(idx)} className="text-slate-500 underline">Skipped. Place it</button>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Did not finish</span>
                      )}
                    </div>
                  </div>
                  {item.status === 'error' && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md bg-rose-50 px-2 py-1.5 text-rose-800">
                      <span>{item.errorMessage}</span>
                      <span className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => retry(idx)} className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:underline"><RotateCcw className="h-3 w-3" />Retry</button>
                        <button type="button" onClick={() => replace(idx)} className="font-medium text-rose-700 hover:underline">Change spot</button>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {doneCount > 0 && <p className="text-[11px] text-slate-500">Each finished item appears in the chat below with Apply and Undo. Nothing goes into the Classroom until you click Apply.</p>}
          </div>
        )}
      </div>

      {/* Placement Picker Modal for active queue item */}
      {placingIndex !== null && currentActiveSuggestion && (
        <PlacementPicker
          isOpen
          key={placingIndex}
          onClose={handlePlacementClose}
          title={`Place Content: ${currentActiveSuggestion.title}`}
          defaultTarget={placingDefault as PlacementTarget}
          allowedKinds={placingKinds}
          onConfirm={handlePlacementConfirm}
        />
      )}
    </div>
  );
};

export default ChecklistCard;
