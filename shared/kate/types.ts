/** Kate contract (isomorphic). See docs/CLASSROOM_CONTRACT.md section "Kate". */
import type { ItemKind, ItemPayload, LockRule, PlacementTarget, SourceRef } from '../classroom/types';

export type KateActionId =
  | 'quiz' | 'flashcards' | 'worksheet' | 'lesson_plan' | 'reading' | 'lesson' | 'module' | 'course_map'
  | 'rewrite' | 'transcript_cleanup' | 'enrichment';

/** One checkbox in "Here's what I can do with this". */
export interface KateSuggestion {
  id: string;
  action: KateActionId;
  title: string;
  why: string;
  /** false = idea goes BEYOND the uploaded source; shown in a separate, unchecked-by-default group */
  fromSource: boolean;
  defaultChecked: boolean;
  /** Kate's best guess where it belongs; instructor confirms in the Placement Picker */
  suggestedPlacement?: Partial<PlacementTarget>;
  outputKind: ItemKind | 'module' | 'lesson' | 'course';
}

export interface KateChecklist { sourceIds: string[]; summary: string; suggestions: KateSuggestion[] }

export type ChangeOp =
  | { op: 'create_module'; tempId: string; courseId: string; title: string; description?: string; position?: number }
  | { op: 'create_lesson'; tempId: string; courseId: string; moduleId: string; title: string; description?: string; type?: 'video' | 'audio' | 'pdf' | 'quiz' | 'article'; position?: number }
  | { op: 'create_item'; tempId: string; lessonId: string; kind: ItemKind; slot: 'main' | 'section' | 'resource'; title: string; payload: ItemPayload; sourceRefs: SourceRef[]; provenance: 'ai_source_only' | 'ai_with_approved_additions' | 'instructor'; position?: number }
  | { op: 'update_item'; itemId: string; title?: string; payload?: ItemPayload; sourceRefs?: SourceRef[]; expectedVersion: number }
  | { op: 'update_lesson'; lessonId: string; title?: string; description?: string; expectedVersion: number }
  | { op: 'archive_item'; itemId: string }
  | { op: 'set_lock'; entityType: 'course' | 'module' | 'lesson' | 'lesson_item'; entityId: string; rule: LockRule; message?: string }
  | { op: 'remove_lock'; entityType: 'course' | 'module' | 'lesson' | 'lesson_item'; entityId: string };
/** moduleId / lessonId in later ops may reference an earlier op's tempId ("temp:<tempId>"). */

export interface ChangeSetDraft {
  title: string;
  summary: string;
  courseId: string;
  ops: ChangeOp[];
  /** checker result: unsupported claims block apply unless instructor overrides beyond-source additions */
  audit?: { passed: boolean; unsupportedClaims: { text: string; reason: string }[]; gaps: string[] };
}

export interface ChangeSetView {
  id: string; courseId: string; title: string; summary: string | null; status: 'proposed' | 'applied' | 'reverted' | 'rejected';
  ops: (ChangeOp & { summary: string })[]; audit?: ChangeSetDraft['audit']; createdAt: string; appliedAt: string | null;
}

export interface KateMessageView {
  id: string; role: 'user' | 'assistant'; content: string; createdAt: string;
  checklist?: KateChecklist; changeSetId?: string; placementRequest?: { forAction: KateActionId; suggestion?: Partial<PlacementTarget> };
  lockQuestion?: { changeSetId: string };
}

/** Generators (server/kate/generators) share this signature. */
export interface GeneratorInput {
  organizationId: string; userId: string; courseId: string;
  sourceIds: string[]; instruction?: string; placement: PlacementTarget;
  allowBeyondSource: boolean; approvedAdditions?: string[];
  lock?: { rule: LockRule; message?: string } | null;
}
