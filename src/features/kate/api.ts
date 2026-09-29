import { apiFetch } from '../../services/api/client';
import type {
  KateChecklist,
  KateMessageView,
  KateActionId,
  GeneratorInput,
  ChangeSetView,
} from '../../../shared/kate/types';
import type { LockRule } from '../../../shared/classroom/types';

export interface KateThread {
  id: string;
  courseId?: string | null;
  sourceId?: string | null;
  context?: Record<string, unknown>;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThreadRequest {
  courseId?: string;
  sourceId?: string;
  context?: Record<string, unknown>;
}

export interface SendMessageRequest {
  content: string;
  context?: {
    courseId?: string;
    lessonId?: string;
    moduleId?: string;
    sourceIds?: string[];
  };
}

export interface GenerateRequest {
  action: KateActionId;
  input: GeneratorInput;
  threadId?: string;
}

export interface SetLockRequest {
  entityType: 'course' | 'module' | 'lesson' | 'lesson_item';
  entityId: string;
  rule: LockRule;
  message?: string;
}

/**
 * POST /api/kate/threads
 */
export async function createThread(req: CreateThreadRequest = {}): Promise<{ thread: KateThread }> {
  return apiFetch<{ thread: KateThread }>('/api/kate/threads', {
    method: 'POST',
    json: req,
  });
}

/**
 * GET /api/kate/threads
 */
export async function getThreads(): Promise<{ threads: KateThread[] }> {
  const res = await apiFetch<{ threads?: KateThread[] } | KateThread[]>('/api/kate/threads');
  if (Array.isArray(res)) {
    return { threads: res };
  }
  return { threads: res.threads || [] };
}

/**
 * GET /api/kate/threads/:id
 */
export async function getThread(
  threadId: string
): Promise<{ thread: KateThread; messages: KateMessageView[] }> {
  return apiFetch<{ thread: KateThread; messages: KateMessageView[] }>(
    `/api/kate/threads/${threadId}`
  );
}

/**
 * POST /api/kate/threads/:id/messages
 */
export async function sendMessage(
  threadId: string,
  req: SendMessageRequest
): Promise<{ messages: KateMessageView[] }> {
  const res = await apiFetch<{ messages?: KateMessageView[] } | KateMessageView[]>(
    `/api/kate/threads/${threadId}/messages`,
    {
      method: 'POST',
      json: req,
    }
  );
  if (Array.isArray(res)) {
    return { messages: res };
  }
  return { messages: res.messages || [] };
}

/**
 * POST /api/kate/checklist
 */
export async function getChecklist(req: {
  sourceIds: string[];
  threadId?: string;
}): Promise<KateChecklist> {
  const res = await apiFetch<KateChecklist | { checklist: KateChecklist }>(
    '/api/kate/checklist',
    {
      method: 'POST',
      json: req,
    }
  );
  if ('checklist' in res && res.checklist) {
    return res.checklist;
  }
  return res as KateChecklist;
}

/**
 * POST /api/kate/generate
 */
export async function generateContent(
  req: GenerateRequest
): Promise<{ changeSet?: ChangeSetView; jobId?: string }> {
  return apiFetch<{ changeSet?: ChangeSetView; jobId?: string }>('/api/kate/generate', {
    method: 'POST',
    json: req,
  });
}

/**
 * GET /api/kate/change-sets/:id
 */
export async function getChangeSet(id: string): Promise<ChangeSetView> {
  const res = await apiFetch<ChangeSetView | { changeSet: ChangeSetView }>(
    `/api/kate/change-sets/${id}`
  );
  if ('changeSet' in res && res.changeSet) {
    return res.changeSet;
  }
  return res as ChangeSetView;
}

/**
 * POST /api/kate/change-sets/:id/apply
 */
export async function applyChangeSet(
  id: string,
  body?: { overrideAudit?: boolean }
): Promise<{ changeSet: ChangeSetView; created: Record<string, string> }> {
  return apiFetch<{ changeSet: ChangeSetView; created: Record<string, string> }>(
    `/api/kate/change-sets/${id}/apply`,
    {
      method: 'POST',
      json: body || {},
    }
  );
}

/**
 * POST /api/kate/change-sets/:id/revert
 */
export async function revertChangeSet(id: string): Promise<{ changeSet: ChangeSetView }> {
  return apiFetch<{ changeSet: ChangeSetView }>(`/api/kate/change-sets/${id}/revert`, {
    method: 'POST',
  });
}

/**
 * PUT /api/studio/classroom/locks
 */
export async function setClassroomLock(
  req: SetLockRequest
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/api/studio/classroom/locks', {
    method: 'PUT',
    json: req,
  });
}
