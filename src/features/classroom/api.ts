import { apiFetch } from '../../services/api/client';
import type {
  ClassroomResponse,
  ClassroomCourse,
  ClassroomModule,
  ClassroomLesson,
  LessonItem,
  ItemPayload,
  LockRule,
  LockEntity,
  PlacementTarget,
  SourceRef,
  Provenance,
} from '../../../shared/classroom/types';

export interface QuizAttemptResult {
  scorePercent: number;
  passed: boolean;
  results: {
    questionId: string;
    correct: boolean;
    correctOptionIds: string[];
    explanation?: string;
  }[];
}

export interface TreeLesson {
  id: string;
  title: string;
  position: number;
  itemCount: number;
}

export interface TreeModule {
  id: string;
  title: string;
  position: number;
  lessons: TreeLesson[];
}

export interface TreeCourse {
  id: string;
  title: string;
  courseCode: string | null;
  modules: TreeModule[];
}

export interface ClassroomTreeResponse {
  courses: TreeCourse[];
}

export async function getClassroomCourses(): Promise<ClassroomResponse> {
  return apiFetch<ClassroomResponse>('/classroom/courses');
}

export async function completeLesson(lessonId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/classroom/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: 'POST',
  });
}

export async function attemptQuizItem(
  itemId: string,
  answers: Record<string, string[]>
): Promise<QuizAttemptResult> {
  return apiFetch<QuizAttemptResult>(`/classroom/items/${encodeURIComponent(itemId)}/attempt`, {
    method: 'POST',
    json: { answers },
  });
}

export async function getClassroomTree(): Promise<ClassroomTreeResponse> {
  return apiFetch<ClassroomTreeResponse>('/studio/classroom/tree');
}

export async function createClassroomItem(data: {
  target: PlacementTarget;
  title: string;
  payload: ItemPayload;
  sourceRefs?: SourceRef[];
  provenance?: Provenance;
}): Promise<{ item: LessonItem; createdModuleId?: string; createdLessonId?: string }> {
  return apiFetch<{ item: LessonItem; createdModuleId?: string; createdLessonId?: string }>(
    '/studio/classroom/items',
    {
      method: 'POST',
      json: data,
    }
  );
}

export async function updateClassroomItem(
  itemId: string,
  data: {
    expectedVersion: number;
    title?: string;
    payload?: ItemPayload;
    published?: boolean;
    position?: number;
  }
): Promise<{ item: LessonItem }> {
  return apiFetch<{ item: LessonItem }>(`/studio/classroom/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    json: data,
  });
}

export async function deleteClassroomItem(itemId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/studio/classroom/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  });
}

export async function createModule(data: {
  courseId: string;
  title: string;
  description?: string;
  position?: number;
}): Promise<{ module: ClassroomModule }> {
  return apiFetch<{ module: ClassroomModule }>('/studio/classroom/modules', {
    method: 'POST',
    json: data,
  });
}

export async function updateModule(
  moduleId: string,
  data: {
    title?: string;
    description?: string;
    position?: number;
  }
): Promise<{ module: ClassroomModule }> {
  return apiFetch<{ module: ClassroomModule }>(`/studio/classroom/modules/${encodeURIComponent(moduleId)}`, {
    method: 'PATCH',
    json: data,
  });
}

export async function createLesson(data: {
  moduleId: string;
  title: string;
  description?: string;
  type?: string;
  position?: number;
}): Promise<{ lesson: ClassroomLesson }> {
  return apiFetch<{ lesson: ClassroomLesson }>('/studio/classroom/lessons', {
    method: 'POST',
    json: data,
  });
}

export async function updateLesson(
  lessonId: string,
  data: {
    title?: string;
    description?: string;
    position?: number;
  }
): Promise<{ lesson: ClassroomLesson }> {
  return apiFetch<{ lesson: ClassroomLesson }>(`/studio/classroom/lessons/${encodeURIComponent(lessonId)}`, {
    method: 'PATCH',
    json: data,
  });
}

export async function setLock(data: {
  entityType: LockEntity;
  entityId: string;
  rule: LockRule;
  message?: string;
}): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/studio/classroom/locks', {
    method: 'PUT',
    json: data,
  });
}

export async function removeLock(
  entityType: LockEntity,
  entityId: string
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(
    `/studio/classroom/locks?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
    {
      method: 'DELETE',
    }
  );
}
