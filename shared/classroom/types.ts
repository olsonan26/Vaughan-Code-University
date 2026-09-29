/** Classroom contract (isomorphic). See docs/CLASSROOM_CONTRACT.md. DB: migration 0014. */

export type ItemKind = 'video' | 'audio' | 'pdf' | 'reading' | 'image' | 'quiz' | 'resource' | 'flashcards' | 'worksheet' | 'lesson_plan';
export type ItemSlot = 'main' | 'section' | 'resource';
export type Provenance = 'instructor' | 'ai_source_only' | 'ai_with_approved_additions' | 'imported';

export interface SourceRef { sourceId: string; chunkId?: string; figureId?: string; page?: number | null; startSeconds?: number | null; quote?: string }

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: 'single' | 'multiple' | 'true_false';
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanation?: string;
  sourceRefs?: SourceRef[];
}

export type ItemPayload =
  | { kind: 'video'; youtubeId?: string; url: string; transcript?: string }
  | { kind: 'audio'; url: string; transcript?: string; durationSeconds?: number }
  | { kind: 'pdf'; url: string; fileName?: string; sizeBytes?: number }
  | { kind: 'reading'; markdown: string }
  | { kind: 'image'; url: string; alt: string; caption?: string }
  | { kind: 'quiz'; passingScorePercent: number; xpReward?: number; questions: QuizQuestion[] }
  | { kind: 'resource'; url: string; resourceType: 'pdf' | 'code' | 'link' | 'audio'; size?: string }
  | { kind: 'flashcards'; cards: { front: string; back: string; sourceRefs?: SourceRef[] }[] }
  | { kind: 'worksheet'; markdown: string }
  | { kind: 'lesson_plan'; markdown: string };

export interface LessonItem {
  id: string;
  lessonId: string;
  kind: ItemKind;
  slot: ItemSlot;
  position: number;
  title: string | null;
  payload: ItemPayload;
  sourceRefs: SourceRef[];
  provenance: Provenance;
  published: boolean;
  version: number;
  lock: LockState | null;
}

export type LockRule =
  | { type: 'manual' }
  | { type: 'after_previous' }
  | { type: 'after_lesson'; lessonId: string }
  | { type: 'after_quiz'; itemId: string; minScore: number }
  | { type: 'min_level'; level: number }
  | { type: 'date'; at: string };

export type LockEntity = 'course' | 'module' | 'lesson' | 'lesson_item';

/** What a viewer sees about a lock. For instructors `rule` is always included. */
export interface LockState {
  lockId: string;
  rule: LockRule;
  message: string | null;
  /** true when the CURRENT viewer is blocked (instructors are never blocked but see locked=true preview via `wouldBlockStudents`) */
  locked: boolean;
  wouldBlockStudents: boolean;
  /** human sentence, e.g. "Unlocks after you pass the Module 1 quiz (80%)" */
  reason: string;
}

export interface ClassroomLesson {
  id: string; legacyId: string | null; moduleId: string; title: string; description: string | null;
  type: 'video' | 'audio' | 'pdf' | 'quiz' | 'article'; durationMinutes: number; xpReward: number; position: number;
  isProOnly: boolean; lockedLevel: number | null;
  items: LessonItem[]; lock: LockState | null; completed: boolean;
}
export interface ClassroomModule { id: string; legacyId: string | null; title: string; description: string | null; position: number; lessons: ClassroomLesson[]; lock: LockState | null }
export interface ClassroomCourse {
  id: string; legacyId: string | null; courseCode: string | null; title: string; slug: string; tagline: string | null; description: string | null;
  thumbnailUrl: string | null; badge: string | null; category: string | null; requiredTier: string; requiredLevel: number; position: number;
  modules: ClassroomModule[]; lock: LockState | null;
}

/** GET /api/classroom/courses -> { courses: ClassroomCourse[], viewer: { isInstructor: boolean, level: number } } */
export interface ClassroomResponse { courses: ClassroomCourse[]; viewer: { userId: string | null; isInstructor: boolean; level: number } }

/** A place in the Classroom where new material goes. Used by the Placement Picker and by Kate. */
export interface PlacementTarget {
  courseId: string;
  moduleId: string | 'new';
  newModuleTitle?: string;
  lessonId: string | 'new';
  newLessonTitle?: string;
  kind: ItemKind;
  slot: ItemSlot;
  /** insert position inside the lesson; omit = append */
  position?: number;
  /** optional lock to create together with the item */
  lock?: { rule: LockRule; message?: string } | null;
}
