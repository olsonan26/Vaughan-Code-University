import { apiFetch } from '../../services/api/client';
import type {
  PlacementTarget,
  LockRule,
  ItemKind,
  ItemSlot,
  ItemPayload,
  SourceRef,
  Provenance,
  LockEntity,
  LockState,
  LessonItem,
} from '../../../shared/classroom/types';

export interface StudioTreeItem {
  id: string;
  title: string | null;
  kind: ItemKind;
  slot: ItemSlot;
  position: number;
}

export interface StudioTreeQuiz {
  id: string;
  title: string;
}

export interface StudioTreeLesson {
  id: string;
  title: string;
  position: number;
  itemCount?: number;
  items?: StudioTreeItem[];
  quizzes?: StudioTreeQuiz[];
}

export interface StudioTreeModule {
  id: string;
  title: string;
  position: number;
  lessons: StudioTreeLesson[];
}

export interface StudioTreeCourse {
  id: string;
  title: string;
  courseCode: string | null;
  modules: StudioTreeModule[];
}

export interface StudioClassroomTreeResponse {
  courses: StudioTreeCourse[];
}

export interface CreateItemResponse {
  item: LessonItem;
  createdModuleId?: string;
  createdLessonId?: string;
}

export interface SetLockResponse {
  ok: boolean;
  lock?: LockState;
}

export const placementApi = {
  getTree: (): Promise<StudioClassroomTreeResponse> => {
    return apiFetch<StudioClassroomTreeResponse>('/api/studio/classroom/tree');
  },

  createItem: (
    target: PlacementTarget,
    title: string,
    payload: ItemPayload,
    sourceRefs?: SourceRef[],
    provenance?: Provenance
  ): Promise<CreateItemResponse> => {
    return apiFetch<CreateItemResponse>('/api/studio/classroom/items', {
      method: 'POST',
      json: {
        target,
        title,
        payload,
        sourceRefs,
        provenance,
      },
    });
  },

  setLock: (
    entityType: LockEntity,
    entityId: string,
    rule: LockRule,
    message?: string
  ): Promise<SetLockResponse> => {
    return apiFetch<SetLockResponse>('/api/studio/classroom/locks', {
      method: 'PUT',
      json: {
        entityType,
        entityId,
        rule,
        message,
      },
    });
  },

  removeLock: (
    entityType: LockEntity,
    entityId: string
  ): Promise<{ ok: boolean }> => {
    const params = new URLSearchParams({ entityType, entityId });
    return apiFetch<{ ok: boolean }>(`/api/studio/classroom/locks?${params.toString()}`, {
      method: 'DELETE',
    });
  },
};
