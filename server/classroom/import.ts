import type { Course } from '../../src/types.js';
import { parseYouTubeId } from './youtube.js';

export interface ImportCounts {
  courses: number;
  modules: number;
  lessons: number;
  items: number;
  locks: number;
}

export interface ClassroomImportRepository {
  upsertCourse(course: {
    orgId: string;
    legacyId: string;
    title: string;
    slug: string;
    courseCode?: string | null;
    tagline?: string | null;
    description: string;
    thumbnailUrl?: string | null;
    requiredTier: string;
    requiredLevel: number;
    position: number;
    classroomVisible: boolean;
    state: string;
    ownerUserId?: string | null;
  }): Promise<{ id: string }>;

  upsertModule(module: {
    courseId: string;
    legacyId: string;
    title: string;
    description?: string | null;
    position: number;
  }): Promise<{ id: string }>;

  upsertLesson(lesson: {
    courseId: string;
    moduleId: string;
    legacyId: string;
    title: string;
    description?: string | null;
    type: string;
    durationMinutes: number;
    xpReward: number;
    position: number;
    isProOnly: boolean;
    lockedLevel?: number | null;
  }): Promise<{ id: string }>;

  upsertLessonItem(item: {
    orgId: string;
    courseId: string;
    lessonId: string;
    kind: string;
    slot: string;
    position: number;
    title?: string | null;
    payload: Record<string, any>;
    provenance: string;
    published: boolean;
    createdBy?: string | null;
  }): Promise<{ id: string }>;

  upsertLock(lock: {
    orgId: string;
    courseId: string;
    entityType: 'course' | 'module' | 'lesson' | 'lesson_item';
    entityId: string;
    rule: Record<string, any>;
    message?: string | null;
    createdBy?: string | null;
  }): Promise<{ id: string }>;
}

export async function importCatalog(
  repo: ClassroomImportRepository,
  orgId: string,
  courses: Course[],
  options?: { ownerUserId?: string }
): Promise<ImportCounts> {
  const counts: ImportCounts = {
    courses: 0,
    modules: 0,
    lessons: 0,
    items: 0,
    locks: 0,
  };

  for (let cIdx = 0; cIdx < courses.length; cIdx++) {
    const c = courses[cIdx];
    const courseRes = await repo.upsertCourse({
      orgId,
      legacyId: c.id,
      title: c.title,
      slug: c.slug,
      courseCode: c.courseCode ?? null,
      tagline: c.tagline ?? null,
      description: c.description,
      thumbnailUrl: c.thumbnail ?? null,
      requiredTier: c.requiredTier || 'free',
      requiredLevel: c.requiredLevel || 1,
      position: cIdx,
      classroomVisible: true,
      state: 'published',
      ownerUserId: options?.ownerUserId ?? null,
    });
    const courseId = courseRes.id;
    counts.courses++;

    for (let mIdx = 0; mIdx < (c.modules || []).length; mIdx++) {
      const m = c.modules[mIdx];
      const modRes = await repo.upsertModule({
        courseId,
        legacyId: m.id,
        title: m.title,
        description: m.description ?? null,
        position: mIdx,
      });
      const moduleId = modRes.id;
      counts.modules++;

      for (let lIdx = 0; lIdx < (m.lessons || []).length; lIdx++) {
        const les = m.lessons[lIdx];
        const lesRes = await repo.upsertLesson({
          courseId,
          moduleId,
          legacyId: les.id,
          title: les.title,
          description: les.description ?? null,
          type: les.type || 'article',
          durationMinutes: les.durationMinutes || 10,
          xpReward: les.xpReward || 20,
          position: lIdx,
          isProOnly: les.isProOnly || false,
          lockedLevel: les.lockedLevel ?? null,
        });
        const lessonId = lesRes.id;
        counts.lessons++;

        let itemPos = 0;

        // a) contentMarkdown -> reading
        if (les.contentMarkdown && les.contentMarkdown.trim().length > 0) {
          await repo.upsertLessonItem({
            orgId,
            courseId,
            lessonId,
            kind: 'reading',
            slot: 'main',
            position: itemPos++,
            title: les.title,
            payload: {
              kind: 'reading',
              markdown: les.contentMarkdown,
              legacyKey: `${les.id}:reading`,
            },
            provenance: 'imported',
            published: true,
            createdBy: options?.ownerUserId ?? null,
          });
          counts.items++;
        }

        // b) videoUrl -> video
        if (les.videoUrl) {
          const ytId = parseYouTubeId(les.videoUrl);
          const payload: Record<string, any> = {
            kind: 'video',
            url: les.videoUrl,
            legacyKey: `${les.id}:video`,
          };
          if (ytId) payload.youtubeId = ytId;

          await repo.upsertLessonItem({
            orgId,
            courseId,
            lessonId,
            kind: 'video',
            slot: 'main',
            position: itemPos++,
            title: les.title,
            payload,
            provenance: 'imported',
            published: true,
            createdBy: options?.ownerUserId ?? null,
          });
          counts.items++;
        }

        // c) audioUrl -> audio
        if (les.audioUrl) {
          const payload: Record<string, any> = {
            kind: 'audio',
            url: les.audioUrl,
            legacyKey: `${les.id}:audio`,
          };
          if (les.audioTranscript) {
            payload.transcript = les.audioTranscript;
          }

          await repo.upsertLessonItem({
            orgId,
            courseId,
            lessonId,
            kind: 'audio',
            slot: 'main',
            position: itemPos++,
            title: les.title,
            payload,
            provenance: 'imported',
            published: true,
            createdBy: options?.ownerUserId ?? null,
          });
          counts.items++;
        }

        // d) pdfUrl -> pdf
        if (les.pdfUrl) {
          const payload: Record<string, any> = {
            kind: 'pdf',
            url: les.pdfUrl,
            legacyKey: `${les.id}:pdf`,
          };
          if (les.pdfFileName) payload.fileName = les.pdfFileName;

          await repo.upsertLessonItem({
            orgId,
            courseId,
            lessonId,
            kind: 'pdf',
            slot: 'main',
            position: itemPos++,
            title: les.pdfFileName || les.title,
            payload,
            provenance: 'imported',
            published: true,
            createdBy: options?.ownerUserId ?? null,
          });
          counts.items++;
        }

        // e) quiz -> quiz
        if (les.quiz) {
          const questions = (les.quiz.questions || []).map((q) => ({
            id: q.id,
            prompt: q.question,
            type: 'single' as const,
            options: (q.options || []).map((optText, optIdx) => ({
              id: String(optIdx),
              text: optText,
            })),
            correctOptionIds: [String(q.correctAnswerIndex)],
            explanation: q.explanation || undefined,
          }));

          await repo.upsertLessonItem({
            orgId,
            courseId,
            lessonId,
            kind: 'quiz',
            slot: 'main',
            position: itemPos++,
            title: les.quiz.title || les.title,
            payload: {
              kind: 'quiz',
              passingScorePercent: les.quiz.passingScorePercentage ?? 80,
              xpReward: les.quiz.xpReward ?? les.xpReward ?? 50,
              questions,
              legacyKey: `${les.id}:quiz:${les.quiz.id || 'default'}`,
            },
            provenance: 'imported',
            published: true,
            createdBy: options?.ownerUserId ?? null,
          });
          counts.items++;
        }

        // f) resources -> resource
        if (Array.isArray(les.resources) && les.resources.length > 0) {
          for (let rIdx = 0; rIdx < les.resources.length; rIdx++) {
            const res = les.resources[rIdx];
            await repo.upsertLessonItem({
              orgId,
              courseId,
              lessonId,
              kind: 'resource',
              slot: 'resource',
              position: itemPos++,
              title: res.title,
              payload: {
                kind: 'resource',
                url: res.url,
                resourceType: res.type,
                size: res.size || undefined,
                legacyKey: `${les.id}:resource:${rIdx}`,
              },
              provenance: 'imported',
              published: true,
              createdBy: options?.ownerUserId ?? null,
            });
            counts.items++;
          }
        }

        // g) lockedLevel -> content_locks min_level
        if (typeof les.lockedLevel === 'number' && les.lockedLevel > 0) {
          await repo.upsertLock({
            orgId,
            courseId,
            entityType: 'lesson',
            entityId: lessonId,
            rule: { type: 'min_level', level: les.lockedLevel },
            message: `Requires Level ${les.lockedLevel}`,
            createdBy: options?.ownerUserId ?? null,
          });
          counts.locks++;
        }
      }
    }
  }

  return counts;
}

export class InMemoryClassroomImportRepository implements ClassroomImportRepository {
  public coursesMap = new Map<string, any>();
  public modulesMap = new Map<string, any>();
  public lessonsMap = new Map<string, any>();
  public lessonItemsMap = new Map<string, any>();
  public locksMap = new Map<string, any>();

  async upsertCourse(course: Parameters<ClassroomImportRepository['upsertCourse']>[0]) {
    const key = `${course.orgId}:${course.legacyId}`;
    let existing = this.coursesMap.get(key);
    if (!existing) {
      existing = { id: `course-uuid-${course.legacyId}`, ...course };
      this.coursesMap.set(key, existing);
    } else {
      Object.assign(existing, course);
    }
    return { id: existing.id };
  }

  async upsertModule(module: Parameters<ClassroomImportRepository['upsertModule']>[0]) {
    const key = `${module.courseId}:${module.legacyId}`;
    let existing = this.modulesMap.get(key);
    if (!existing) {
      existing = { id: `mod-uuid-${module.legacyId}`, ...module };
      this.modulesMap.set(key, existing);
    } else {
      Object.assign(existing, module);
    }
    return { id: existing.id };
  }

  async upsertLesson(lesson: Parameters<ClassroomImportRepository['upsertLesson']>[0]) {
    const key = `${lesson.courseId}:${lesson.legacyId}`;
    let existing = this.lessonsMap.get(key);
    if (!existing) {
      existing = { id: `les-uuid-${lesson.legacyId}`, ...lesson };
      this.lessonsMap.set(key, existing);
    } else {
      Object.assign(existing, lesson);
    }
    return { id: existing.id };
  }

  async upsertLessonItem(item: Parameters<ClassroomImportRepository['upsertLessonItem']>[0]) {
    const legacyKey = item.payload.legacyKey;
    const key = `${item.lessonId}:${legacyKey}`;
    let existing = this.lessonItemsMap.get(key);
    if (!existing) {
      existing = { id: `item-uuid-${item.lessonId}-${legacyKey}`, ...item };
      this.lessonItemsMap.set(key, existing);
    } else {
      Object.assign(existing, item);
    }
    return { id: existing.id };
  }

  async upsertLock(lock: Parameters<ClassroomImportRepository['upsertLock']>[0]) {
    const key = `${lock.entityType}:${lock.entityId}`;
    let existing = this.locksMap.get(key);
    if (!existing) {
      existing = { id: `lock-uuid-${lock.entityType}-${lock.entityId}`, ...lock };
      this.locksMap.set(key, existing);
    } else {
      Object.assign(existing, lock);
    }
    return { id: existing.id };
  }
}

export class SupabaseClassroomImportRepository implements ClassroomImportRepository {
  constructor(private supabase: any) {}

  async upsertCourse(course: Parameters<ClassroomImportRepository['upsertCourse']>[0]) {
    const { data, error } = await this.supabase
      .from('courses')
      .upsert(
        {
          organization_id: course.orgId,
          legacy_id: course.legacyId,
          title: course.title,
          slug: course.slug,
          course_code: course.courseCode ?? null,
          tagline: course.tagline ?? null,
          description: course.description ?? null,
          thumbnail_url: course.thumbnailUrl ?? null,
          required_tier: course.requiredTier,
          required_level: course.requiredLevel,
          position: course.position,
          classroom_visible: course.classroomVisible,
          state: course.state,
          created_by: course.ownerUserId ?? null,
        },
        { onConflict: 'organization_id,legacy_id' }
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Supabase upsertCourse error: ${error.message}`);
    }
    return { id: data.id };
  }

  async upsertModule(module: Parameters<ClassroomImportRepository['upsertModule']>[0]) {
    const { data, error } = await this.supabase
      .from('modules')
      .upsert(
        {
          course_id: module.courseId,
          legacy_id: module.legacyId,
          title: module.title,
          description: module.description ?? null,
          position: module.position,
        },
        { onConflict: 'course_id,legacy_id' }
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Supabase upsertModule error: ${error.message}`);
    }
    return { id: data.id };
  }

  async upsertLesson(lesson: Parameters<ClassroomImportRepository['upsertLesson']>[0]) {
    const { data, error } = await this.supabase
      .from('lessons')
      .upsert(
        {
          course_id: lesson.courseId,
          module_id: lesson.moduleId,
          legacy_id: lesson.legacyId,
          title: lesson.title,
          description: lesson.description ?? null,
          type: lesson.type,
          duration_minutes: lesson.durationMinutes,
          xp_reward: lesson.xpReward,
          position: lesson.position,
          is_pro_only: lesson.isProOnly,
          locked_level: lesson.lockedLevel ?? null,
        },
        { onConflict: 'course_id,legacy_id' }
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Supabase upsertLesson error: ${error.message}`);
    }
    return { id: data.id };
  }

  async upsertLessonItem(item: Parameters<ClassroomImportRepository['upsertLessonItem']>[0]) {
    const legacyKey = item.payload.legacyKey;
    const { data: existing } = await this.supabase
      .from('lesson_items')
      .select('id')
      .eq('lesson_id', item.lessonId)
      .eq('payload->>legacyKey', legacyKey)
      .maybeSingle();

    if (existing) {
      const { data, error } = await this.supabase
        .from('lesson_items')
        .update({
          kind: item.kind,
          slot: item.slot,
          position: item.position,
          title: item.title ?? null,
          payload: item.payload,
          provenance: item.provenance,
          published: item.published,
        })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) {
        throw new Error(`Supabase updateLessonItem error: ${error.message}`);
      }
      return { id: data.id };
    } else {
      const { data, error } = await this.supabase
        .from('lesson_items')
        .insert({
          organization_id: item.orgId,
          course_id: item.courseId,
          lesson_id: item.lessonId,
          kind: item.kind,
          slot: item.slot,
          position: item.position,
          title: item.title ?? null,
          payload: item.payload,
          provenance: item.provenance,
          published: item.published,
          created_by: item.createdBy ?? null,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Supabase insertLessonItem error: ${error.message}`);
      }
      return { id: data.id };
    }
  }

  async upsertLock(lock: Parameters<ClassroomImportRepository['upsertLock']>[0]) {
    const { data, error } = await this.supabase
      .from('content_locks')
      .upsert(
        {
          organization_id: lock.orgId,
          course_id: lock.courseId,
          entity_type: lock.entityType,
          entity_id: lock.entityId,
          rule: lock.rule,
          message: lock.message ?? null,
          created_by: lock.createdBy ?? null,
        },
        { onConflict: 'entity_type,entity_id' }
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Supabase upsertLock error: ${error.message}`);
    }
    return { id: data.id };
  }
}
