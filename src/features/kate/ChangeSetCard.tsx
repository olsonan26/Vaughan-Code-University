import React, { useState } from 'react';
import type { ChangeSetView } from '../../../shared/kate/types';
import type { LockRule } from '../../../shared/classroom/types';
import { getOpSummary, canApplyChangeSet } from './kateHelpers';
import { applyChangeSet, revertChangeSet, setClassroomLock } from './api';
import { LockEditor } from './placement';

import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  ExternalLink,
  Eye,
  FileText,
  Lock,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

export interface ChangeSetCardProps {
  changeSet: ChangeSetView;
  onApplied?: (changeSet: ChangeSetView) => void;
  onReverted?: (changeSet: ChangeSetView) => void;
}

export const ChangeSetCard: React.FC<ChangeSetCardProps> = ({
  changeSet: initialChangeSet,
  onApplied,
  onReverted,
}) => {
  const [changeSet, setChangeSet] = useState<ChangeSetView>(initialChangeSet);
  const [expandedPreview, setExpandedPreview] = useState<boolean>(false);
  const [overrideAudit, setOverrideAudit] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isReverting, setIsReverting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedCreatedMap, setAppliedCreatedMap] = useState<Record<string, string>>({});

  // Lock state after applying
  const [selectedLockRule, setSelectedLockRule] = useState<LockRule>({ type: 'after_previous' });
  const [isSettingLock, setIsSettingLock] = useState<boolean>(false);
  const [lockSaved, setLockSaved] = useState<boolean>(false);

  const auditPassed = changeSet.audit ? changeSet.audit.passed : true;
  const canApply = canApplyChangeSet(changeSet, overrideAudit);

  const handleApply = async () => {
    setError(null);
    setIsApplying(true);
    try {
      const res = await applyChangeSet(changeSet.id, { overrideAudit });
      setChangeSet(res.changeSet);
      if (res.created) {
        setAppliedCreatedMap(res.created);
      }
      // Dispatch classroom:refresh
      window.dispatchEvent(new CustomEvent('classroom:refresh'));
      if (onApplied) onApplied(res.changeSet);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to apply change set';
      setError(message);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRevert = async () => {
    setError(null);
    setIsReverting(true);
    try {
      const res = await revertChangeSet(changeSet.id);
      setChangeSet(res.changeSet);
      // Dispatch classroom:refresh
      window.dispatchEvent(new CustomEvent('classroom:refresh'));
      setLockSaved(false);
      if (onReverted) onReverted(res.changeSet);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to revert change set';
      setError(message);
    } finally {
      setIsReverting(false);
    }
  };

  const handleSaveLock = async () => {
    let entityType: 'course' | 'module' | 'lesson' | 'lesson_item' = 'lesson_item';
    let entityId = '';

    for (const op of changeSet.ops) {
      if (op.op === 'create_item' && op.tempId && appliedCreatedMap[op.tempId]) {
        entityType = 'lesson_item';
        entityId = appliedCreatedMap[op.tempId];
        break;
      } else if (op.op === 'create_lesson' && op.tempId && appliedCreatedMap[op.tempId]) {
        entityType = 'lesson';
        entityId = appliedCreatedMap[op.tempId];
        break;
      } else if (op.op === 'create_module' && op.tempId && appliedCreatedMap[op.tempId]) {
        entityType = 'module';
        entityId = appliedCreatedMap[op.tempId];
        break;
      }
    }

    if (!entityId) {
      const keys = Object.keys(appliedCreatedMap);
      if (keys.length > 0) {
        entityId = appliedCreatedMap[keys[0]];
      }
    }

    if (!entityId) {
      entityId = changeSet.id;
    }

    setIsSettingLock(true);
    try {
      await setClassroomLock({
        entityType,
        entityId,
        rule: selectedLockRule,
      });
      setLockSaved(true);
      window.dispatchEvent(new CustomEvent('classroom:refresh'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set lock rule';
      setError(message);
    } finally {
      setIsSettingLock(false);
    }
  };

  return (
    <div className="my-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <h4 className="font-bold text-slate-900 text-sm">{changeSet.title}</h4>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                changeSet.status === 'applied'
                  ? 'bg-emerald-100 text-emerald-800'
                  : changeSet.status === 'reverted'
                  ? 'bg-slate-100 text-slate-700'
                  : changeSet.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {changeSet.status.charAt(0).toUpperCase() + changeSet.status.slice(1)}
            </span>
          </div>
          {changeSet.summary && (
            <p className="mt-1 text-slate-600">{changeSet.summary}</p>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Op List */}
      <div className="p-4 space-y-2">
        <h5 className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-slate-500" />
          <span>Proposed Changes ({changeSet.ops.length})</span>
        </h5>
        <ul className="space-y-1.5">
          {changeSet.ops.map((op, idx) => (
            <li
              key={idx}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {op.op === 'create_item' ? (
                  <FileText className="w-4 h-4 text-indigo-500" />
                ) : op.op === 'create_lesson' ? (
                  <Layers className="w-4 h-4 text-sky-500" />
                ) : op.op === 'create_module' ? (
                  <Layers className="w-4 h-4 text-purple-500" />
                ) : op.op.includes('lock') ? (
                  <Lock className="w-4 h-4 text-amber-500" />
                ) : (
                  <FileText className="w-4 h-4 text-slate-500" />
                )}
                <span className="font-medium text-slate-800">{getOpSummary(op)}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Expandable Preview */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setExpandedPreview(!expandedPreview)}
            className="flex items-center gap-1.5 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{expandedPreview ? 'Hide Detailed Content Preview' : 'Show Detailed Content Preview'}</span>
            {expandedPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedPreview && (
            <div className="mt-3 p-3 rounded-xl bg-slate-900 text-slate-100 space-y-4 max-h-80 overflow-y-auto font-mono text-[11px]">
              {changeSet.ops.map((op, idx) => {
                if (op.op === 'create_item' && op.payload) {
                  const payload = op.payload;
                  return (
                    <div key={idx} className="border-b border-slate-700 pb-3 last:border-none last:pb-0">
                      <div className="font-bold text-indigo-300 mb-1">
                        [{op.kind.toUpperCase()}] {op.title}
                      </div>
                      {payload.kind === 'quiz' && (
                        <div className="space-y-2">
                          <div className="text-slate-400">Passing Score: {payload.passingScorePercent}%</div>
                          {payload.questions.map((q, qIdx) => (
                            <div key={qIdx} className="pl-2 border-l-2 border-slate-700 space-y-1">
                              <div className="font-semibold text-slate-200">
                                Q{qIdx + 1}: {q.prompt}
                              </div>
                              <div className="pl-2 space-y-0.5">
                                {q.options.map((opt) => {
                                  const isCorrect = q.correctOptionIds.includes(opt.id);
                                  return (
                                    <div
                                      key={opt.id}
                                      className={isCorrect ? 'text-emerald-400 font-bold' : 'text-slate-400'}
                                    >
                                      {isCorrect ? '✓ ' : '  '}
                                      {opt.text}
                                    </div>
                                  );
                                })}
                              </div>
                              {q.explanation && (
                                <div className="text-slate-400 italic text-[10px]">
                                  Explanation: {q.explanation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {(payload.kind === 'reading' || payload.kind === 'worksheet' || payload.kind === 'lesson_plan') && (
                        <div className="whitespace-pre-wrap text-slate-300 font-sans text-[11px] leading-relaxed">
                          {payload.markdown}
                        </div>
                      )}
                      {payload.kind === 'flashcards' && (
                        <div className="space-y-1.5">
                          {payload.cards.map((c, cIdx) => (
                            <div key={cIdx} className="p-2 rounded bg-slate-800 text-slate-200">
                              <div><span className="text-indigo-400 font-semibold">Front:</span> {c.front}</div>
                              <div><span className="text-emerald-400 font-semibold">Back:</span> {c.back}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* Audit Panel */}
        {changeSet.audit && (
          <div className="mt-3 p-3 rounded-xl border border-slate-200">
            {auditPassed ? (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border-emerald-200 p-2.5 rounded-lg border">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Source Audit Passed</span>
                  <p className="text-[11px] text-emerald-600">All claims are fully supported by your uploaded sources.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-amber-50 border-amber-200 p-3 rounded-lg border text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Audit Warnings & Gaps</span>
                    <p className="text-[11px] text-amber-800">
                      Some claims could not be verified in your uploaded sources.
                    </p>
                  </div>
                </div>

                {changeSet.audit.unsupportedClaims.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="font-semibold text-amber-800">Unsupported Claims:</div>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      {changeSet.audit.unsupportedClaims.map((claim, idx) => (
                        <li key={idx} className="text-amber-900">
                          <span className="font-medium">"{claim.text}"</span>: {claim.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {changeSet.audit.gaps.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="font-semibold text-amber-800">Information Gaps:</div>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      {changeSet.audit.gaps.map((gap, idx) => (
                        <li key={idx} className="text-amber-900">{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Override Checkbox */}
                <div className="pt-2 flex items-center gap-2 border-t border-amber-200">
                  <input
                    type="checkbox"
                    id={`override-audit-${changeSet.id}`}
                    checked={overrideAudit}
                    onChange={(e) => setOverrideAudit(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                  />
                  <label htmlFor={`override-audit-${changeSet.id}`} className="font-semibold text-amber-900 cursor-pointer">
                    Apply anyway (approve additions & override audit warnings)
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {changeSet.status === 'proposed' && (
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply || isApplying}
              className={`px-4 py-2 rounded-xl font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm ${
                !canApply || isApplying
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isApplying ? (
                <span>Applying...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply Changes</span>
                </>
              )}
            </button>
          )}

          {changeSet.status === 'applied' && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Applied to Classroom</span>
                </div>

                <button
                  type="button"
                  onClick={handleRevert}
                  disabled={isReverting}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isReverting ? 'Undoing...' : 'Undo / Revert'}</span>
                </button>
              </div>

              {/* Lock Configuration Question */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Set access locks for created items?</span>
                  </div>
                  {lockSaved && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Lock Rule Saved
                    </span>
                  )}
                </div>

                <LockEditor
                  value={selectedLockRule}
                  onChange={setSelectedLockRule}
                />

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <a
                    href="/studio/classroom"
                    className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <span>View in Classroom</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleSaveLock}
                    disabled={isSettingLock}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm disabled:opacity-50"
                  >
                    {isSettingLock ? 'Saving...' : 'Save Lock Rule'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {changeSet.status === 'reverted' && (
            <div className="text-slate-500 font-medium italic">
              Changes were reverted.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeSetCard;
