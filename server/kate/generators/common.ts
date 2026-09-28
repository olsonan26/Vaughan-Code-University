import type { GeneratorDeps } from './types.js';
import type { GeneratorInput, ChangeOp } from '../../../shared/kate/types.js';
import type { ItemKind, ItemPayload, ItemSlot, PlacementTarget, Provenance, SourceRef, LockRule } from '../../../shared/classroom/types.js';
import type { EvidenceChunk } from '../../ai/skills/types.js';
import * as defaultRetrieval from '../retrieval.js';

export function determineProvenance(allowBeyondSource: boolean, approvedAdditions?: string[]): Exclude<Provenance, 'imported'> {
  if (allowBeyondSource || (approvedAdditions && approvedAdditions.length > 0)) {
    return 'ai_with_approved_additions';
  }
  return 'ai_source_only';
}

export function buildSourceRefs(chunks: EvidenceChunk[]): SourceRef[] {
  return chunks.map((c) => ({
    sourceId: (c as any).sourceId || '',
    chunkId: c.id,
    page: c.pageNumber ?? null,
    startSeconds: (c as any).startSeconds ?? null,
    figureId: (c as any).figureId ?? null,
  }));
}

export interface BuildPlacementResult {
  ops: ChangeOp[];
  itemTempId: string;
  effectiveLessonId: string;
  effectiveModuleId: string;
}

export function buildPlacementOps(
  placement: PlacementTarget,
  itemKind: ItemKind,
  title: string,
  payload: ItemPayload,
  sourceRefs: SourceRef[],
  provenance: Exclude<Provenance, 'imported'>,
  lock?: { rule: LockRule; message?: string } | null,
  position?: number
): BuildPlacementResult {
  const ops: ChangeOp[] = [];

  let effectiveModuleId = placement.moduleId;
  if (placement.moduleId === 'new') {
    const modTempId = 'mod_' + Math.random().toString(36).slice(2, 9);
    ops.push({
      op: 'create_module',
      tempId: modTempId,
      courseId: placement.courseId,
      title: placement.newModuleTitle || 'New Module',
      position: 0,
    });
    effectiveModuleId = 'temp:' + modTempId;
  }

  let effectiveLessonId = placement.lessonId;
  if (placement.lessonId === 'new') {
    const lesTempId = 'les_' + Math.random().toString(36).slice(2, 9);
    ops.push({
      op: 'create_lesson',
      tempId: lesTempId,
      courseId: placement.courseId,
      moduleId: effectiveModuleId,
      title: placement.newLessonTitle || 'New Lesson',
      position: 0,
    });
    effectiveLessonId = 'temp:' + lesTempId;
  }

  const itemTempId = 'item_' + Math.random().toString(36).slice(2, 9);
  ops.push({
    op: 'create_item',
    tempId: itemTempId,
    lessonId: effectiveLessonId,
    kind: itemKind,
    slot: placement.slot || 'main',
    title,
    payload,
    sourceRefs,
    provenance,
    position: position ?? placement.position,
  });

  const activeLock = lock || placement.lock;
  if (activeLock) {
    ops.push({
      op: 'set_lock',
      entityType: 'lesson_item',
      entityId: 'temp:' + itemTempId,
      rule: activeLock.rule,
      message: activeLock.message,
    });
  }

  return {
    ops,
    itemTempId,
    effectiveLessonId,
    effectiveModuleId,
  };
}

export async function getEvidenceForInput(
  input: GeneratorInput,
  deps: GeneratorDeps,
  query?: string,
  limit?: number
): Promise<EvidenceChunk[]> {
  const retrieval = deps.retrieval ?? defaultRetrieval;
  return retrieval.getEvidence(deps, input.sourceIds, query, limit);
}

export async function getAllChunksForInput(
  input: GeneratorInput,
  deps: GeneratorDeps,
  maxTokens?: number
): Promise<EvidenceChunk[]> {
  const retrieval = deps.retrieval ?? defaultRetrieval;
  return retrieval.getAllChunks(deps, input.sourceIds, maxTokens);
}
