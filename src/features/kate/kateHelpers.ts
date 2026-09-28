import type { ChangeOp, KateSuggestion } from '../../../shared/kate/types';

/**
 * Formats a ChangeOp into a plain English summary string.
 */
export function getOpSummary(op: ChangeOp): string {
  switch (op.op) {
    case 'create_module':
      return `Create module "${op.title}"`;
    case 'create_lesson':
      return `Create lesson "${op.title}"${op.type ? ` (${op.type})` : ''}`;
    case 'create_item':
      return `Create ${op.kind} item "${op.title}" in ${op.slot} slot`;
    case 'update_item':
      return `Update item ${op.title ? `"${op.title}"` : op.itemId}`;
    case 'update_lesson':
      return `Update lesson ${op.title ? `"${op.title}"` : op.lessonId}`;
    case 'archive_item':
      return `Archive item ${op.itemId}`;
    case 'set_lock':
      return `Set lock rule on ${op.entityType} (${op.entityId})`;
    case 'remove_lock':
      return `Remove lock from ${op.entityType} (${op.entityId})`;
    default:
      return 'Unknown change operation';
  }
}

/**
 * Groups checklist suggestions into "From your source" and "Beyond your source".
 */
export function groupChecklistSuggestions(suggestions: KateSuggestion[] = []): {
  fromSource: KateSuggestion[];
  beyondSource: KateSuggestion[];
} {
  const fromSource: KateSuggestion[] = [];
  const beyondSource: KateSuggestion[] = [];

  for (const item of suggestions) {
    if (item.fromSource) {
      fromSource.push(item);
    } else {
      beyondSource.push(item);
    }
  }

  return { fromSource, beyondSource };
}

/**
 * Determines whether a ChangeSet can be applied given its audit status and user override.
 */
export function canApplyChangeSet(
  changeSet: { audit?: { passed: boolean } } | null | undefined,
  overrideAudit: boolean = false
): boolean {
  if (!changeSet) return false;
  if (!changeSet.audit) return true;
  if (changeSet.audit.passed) return true;
  return overrideAudit;
}
