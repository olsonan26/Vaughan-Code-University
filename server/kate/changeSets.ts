import type { ChangeOp, ChangeSetDraft, ChangeSetView } from '../../shared/kate/types.js';
import type { KateDeps } from './deps.js';
import { HttpError } from '../lib/errors.js';

export interface DBChangeSet {
  id: string;
  organization_id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: 'proposed' | 'applied' | 'reverted' | 'rejected';
  thread_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  applied_at: string | null;
  reverted_at: string | null;
}

export interface DBChangeSetItem {
  id: string;
  change_set_id: string;
  entity_type: string;
  entity_id: string;
  operation: 'create' | 'update' | 'delete' | 'lock' | 'unlock';
  position: number;
  summary: string | null;
  before_snapshot: any | null;
  after_snapshot: any | null;
  status: string;
  applied_at: string | null;
}

export interface KateRepository {
  isKateRepo?: boolean;
  insertChangeSet(cs: DBChangeSet): Promise<void>;
  getChangeSet(id: string): Promise<DBChangeSet | null>;
  updateChangeSetStatus(
    id: string,
    status: 'applied' | 'reverted' | 'rejected',
    timestampField: 'applied_at' | 'reverted_at',
    timestampValue: string
  ): Promise<void>;

  insertChangeSetItems(items: DBChangeSetItem[]): Promise<void>;
  getChangeSetItems(changeSetId: string): Promise<DBChangeSetItem[]>;
  updateChangeSetItem(id: string, updates: Partial<DBChangeSetItem>): Promise<void>;

  createModule(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    title: string;
    description?: string | null;
    position?: number;
  }): Promise<{ id: string }>;
  deleteModule(id: string): Promise<void>;
  getModule(id: string): Promise<any | null>;

  createLesson(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    module_id: string;
    title: string;
    description?: string | null;
    type?: string;
    position?: number;
  }): Promise<{ id: string }>;
  getLesson(id: string): Promise<any | null>;
  updateLesson(id: string, expectedVersion: number, updates: { title?: string; description?: string }): Promise<any>;
  deleteLesson(id: string): Promise<void>;
  restoreLesson(snapshot: any): Promise<void>;

  createLessonItem(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    lesson_id: string;
    kind: string;
    slot?: string;
    title?: string | null;
    payload: any;
    source_refs?: any[];
    provenance?: string;
    position?: number;
    created_by?: string;
  }): Promise<{ id: string }>;
  getLessonItem(id: string): Promise<any | null>;
  updateLessonItem(
    id: string,
    expectedVersion: number,
    updates: { title?: string | null; payload?: any; source_refs?: any[] }
  ): Promise<any>;
  archiveLessonItem(id: string): Promise<void>;
  restoreLessonItem(snapshot: any): Promise<void>;
  deleteLessonItem(id: string): Promise<void>;

  getContentLock(entityType: string, entityId: string): Promise<any | null>;
  upsertContentLock(data: {
    organization_id: string;
    course_id: string;
    entity_type: string;
    entity_id: string;
    rule: any;
    message?: string | null;
    created_by?: string;
  }): Promise<void>;
  deleteContentLock(entityType: string, entityId: string): Promise<void>;
  restoreContentLock(snapshot: any): Promise<void>;

  isCourseTeam?(courseId: string, userId: string): Promise<boolean>;
}

export class InMemoryKateRepository implements KateRepository {
  public isKateRepo = true;
  public changeSets = new Map<string, DBChangeSet>();
  public changeSetItems = new Map<string, DBChangeSetItem[]>();
  public modules = new Map<string, any>();
  public lessons = new Map<string, any>();
  public lessonItems = new Map<string, any>();
  public contentLocks = new Map<string, any>();
  public courseTeamMembers = new Set<string>();

  async insertChangeSet(cs: DBChangeSet): Promise<void> {
    this.changeSets.set(cs.id, { ...cs });
  }

  async getChangeSet(id: string): Promise<DBChangeSet | null> {
    const cs = this.changeSets.get(id);
    return cs ? { ...cs } : null;
  }

  async updateChangeSetStatus(
    id: string,
    status: 'applied' | 'reverted' | 'rejected',
    timestampField: 'applied_at' | 'reverted_at',
    timestampValue: string
  ): Promise<void> {
    const cs = this.changeSets.get(id);
    if (cs) {
      cs.status = status;
      cs[timestampField] = timestampValue;
      cs.updated_at = new Date().toISOString();
    }
  }

  async insertChangeSetItems(items: DBChangeSetItem[]): Promise<void> {
    if (items.length === 0) return;
    const csId = items[0].change_set_id;
    const existing = this.changeSetItems.get(csId) || [];
    this.changeSetItems.set(csId, [...existing, ...items.map((i) => ({ ...i }))]);
  }

  async getChangeSetItems(changeSetId: string): Promise<DBChangeSetItem[]> {
    const items = this.changeSetItems.get(changeSetId) || [];
    return items.map((i) => ({ ...i })).sort((a, b) => a.position - b.position);
  }

  async updateChangeSetItem(id: string, updates: Partial<DBChangeSetItem>): Promise<void> {
    for (const [, items] of this.changeSetItems) {
      const idx = items.findIndex((i) => i.id === id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...updates };
        return;
      }
    }
  }

  async createModule(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    title: string;
    description?: string | null;
    position?: number;
  }): Promise<{ id: string }> {
    const id = data.id || crypto.randomUUID();
    const mod = {
      id,
      organization_id: data.organization_id,
      course_id: data.course_id,
      title: data.title,
      description: data.description ?? null,
      position: data.position ?? 0,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.modules.set(id, mod);
    return { id };
  }

  async deleteModule(id: string): Promise<void> {
    this.modules.delete(id);
  }

  async getModule(id: string): Promise<any | null> {
    const m = this.modules.get(id);
    return m ? { ...m } : null;
  }

  async createLesson(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    module_id: string;
    title: string;
    description?: string | null;
    type?: string;
    position?: number;
  }): Promise<{ id: string }> {
    const id = data.id || crypto.randomUUID();
    const l = {
      id,
      organization_id: data.organization_id,
      course_id: data.course_id,
      module_id: data.module_id,
      title: data.title,
      description: data.description ?? null,
      type: data.type ?? 'article',
      position: data.position ?? 0,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };
    this.lessons.set(id, l);
    return { id };
  }

  async getLesson(id: string): Promise<any | null> {
    const l = this.lessons.get(id);
    return l ? { ...l } : null;
  }

  async updateLesson(id: string, expectedVersion: number, updates: { title?: string; description?: string }): Promise<any> {
    const l = this.lessons.get(id);
    if (!l) throw new HttpError(404, 'not_found', `Lesson ${id} not found`);
    if (l.version !== expectedVersion) {
      throw new HttpError(409, 'version_conflict', `Version conflict on lesson ${id}: expected ${expectedVersion}, got ${l.version}`);
    }
    l.title = updates.title ?? l.title;
    l.description = updates.description ?? l.description;
    l.version += 1;
    l.updated_at = new Date().toISOString();
    return { ...l };
  }

  async deleteLesson(id: string): Promise<void> {
    this.lessons.delete(id);
  }

  async restoreLesson(snapshot: any): Promise<void> {
    this.lessons.set(snapshot.id, { ...snapshot });
  }

  async createLessonItem(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    lesson_id: string;
    kind: string;
    slot?: string;
    title?: string | null;
    payload: any;
    source_refs?: any[];
    provenance?: string;
    position?: number;
    created_by?: string;
  }): Promise<{ id: string }> {
    const id = data.id || crypto.randomUUID();
    const item = {
      id,
      organization_id: data.organization_id,
      course_id: data.course_id,
      lesson_id: data.lesson_id,
      kind: data.kind,
      slot: data.slot ?? 'main',
      title: data.title ?? null,
      payload: data.payload,
      source_refs: data.source_refs ?? [],
      provenance: data.provenance ?? 'instructor',
      position: data.position ?? 0,
      version: 1,
      published: true,
      created_by: data.created_by ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };
    this.lessonItems.set(id, item);
    return { id };
  }

  async getLessonItem(id: string): Promise<any | null> {
    const item = this.lessonItems.get(id);
    return item ? { ...item } : null;
  }

  async updateLessonItem(
    id: string,
    expectedVersion: number,
    updates: { title?: string | null; payload?: any; source_refs?: any[] }
  ): Promise<any> {
    const item = this.lessonItems.get(id);
    if (!item) throw new HttpError(404, 'not_found', `Lesson item ${id} not found`);
    if (item.version !== expectedVersion) {
      throw new HttpError(409, 'version_conflict', `Version conflict on item ${id}: expected ${expectedVersion}, got ${item.version}`);
    }
    if (updates.title !== undefined) item.title = updates.title;
    if (updates.payload !== undefined) item.payload = updates.payload;
    if (updates.source_refs !== undefined) item.source_refs = updates.source_refs;
    item.version += 1;
    item.updated_at = new Date().toISOString();
    return { ...item };
  }

  async archiveLessonItem(id: string): Promise<void> {
    const item = this.lessonItems.get(id);
    if (item) {
      item.archived_at = new Date().toISOString();
    }
  }

  async restoreLessonItem(snapshot: any): Promise<void> {
    this.lessonItems.set(snapshot.id, { ...snapshot });
  }

  async deleteLessonItem(id: string): Promise<void> {
    this.lessonItems.delete(id);
  }

  async getContentLock(entityType: string, entityId: string): Promise<any | null> {
    const key = `${entityType}:${entityId}`;
    const lock = this.contentLocks.get(key);
    return lock ? { ...lock } : null;
  }

  async upsertContentLock(data: {
    organization_id: string;
    course_id: string;
    entity_type: string;
    entity_id: string;
    rule: any;
    message?: string | null;
    created_by?: string;
  }): Promise<void> {
    const key = `${data.entity_type}:${data.entity_id}`;
    const existing = this.contentLocks.get(key);
    const lock = {
      id: existing?.id || crypto.randomUUID(),
      organization_id: data.organization_id,
      course_id: data.course_id,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      rule: data.rule,
      message: data.message ?? null,
      created_by: data.created_by ?? null,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.contentLocks.set(key, lock);
  }

  async deleteContentLock(entityType: string, entityId: string): Promise<void> {
    const key = `${entityType}:${entityId}`;
    this.contentLocks.delete(key);
  }

  async restoreContentLock(snapshot: any): Promise<void> {
    const key = `${snapshot.entity_type}:${snapshot.entity_id}`;
    this.contentLocks.set(key, { ...snapshot });
  }

  async isCourseTeam(courseId: string, userId: string): Promise<boolean> {
    return this.courseTeamMembers.has(`${courseId}:${userId}`);
  }
}

export class SupabaseKateRepository implements KateRepository {
  public isKateRepo = true;
  constructor(private db: any) {}

  async insertChangeSet(cs: DBChangeSet): Promise<void> {
    const { error } = await this.db.from('change_sets').insert(cs);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async getChangeSet(id: string): Promise<DBChangeSet | null> {
    const { data, error } = await this.db.from('change_sets').select('*').eq('id', id).maybeSingle();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return data as DBChangeSet | null;
  }

  async updateChangeSetStatus(
    id: string,
    status: 'applied' | 'reverted' | 'rejected',
    timestampField: 'applied_at' | 'reverted_at',
    timestampValue: string
  ): Promise<void> {
    const { error } = await this.db
      .from('change_sets')
      .update({ status, [timestampField]: timestampValue, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async insertChangeSetItems(items: DBChangeSetItem[]): Promise<void> {
    const { error } = await this.db.from('change_set_items').insert(items);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async getChangeSetItems(changeSetId: string): Promise<DBChangeSetItem[]> {
    const { data, error } = await this.db
      .from('change_set_items')
      .select('*')
      .eq('change_set_id', changeSetId)
      .order('position', { ascending: true });
    if (error) throw new HttpError(500, 'db_error', error.message);
    return (data || []) as DBChangeSetItem[];
  }

  async updateChangeSetItem(id: string, updates: Partial<DBChangeSetItem>): Promise<void> {
    const { error } = await this.db.from('change_set_items').update(updates).eq('id', id);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async createModule(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    title: string;
    description?: string | null;
    position?: number;
  }): Promise<{ id: string }> {
    const { data: res, error } = await this.db
      .from('modules')
      .insert({
        ...(data.id ? { id: data.id } : {}),
        /* modules/lessons have no organization_id column */
        course_id: data.course_id,
        title: data.title,
        description: data.description ?? null,
        position: data.position ?? 0,
      })
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return res;
  }

  async deleteModule(id: string): Promise<void> {
    await this.db.from('content_locks').delete().eq('entity_type', 'module').eq('entity_id', id);
    const { error } = await this.db.from('modules').delete().eq('id', id);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async getModule(id: string): Promise<any | null> {
    const { data, error } = await this.db.from('modules').select('*').eq('id', id).maybeSingle();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return data;
  }

  async createLesson(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    module_id: string;
    title: string;
    description?: string | null;
    type?: string;
    position?: number;
  }): Promise<{ id: string }> {
    const { data: res, error } = await this.db
      .from('lessons')
      .insert({
        ...(data.id ? { id: data.id } : {}),
        /* modules/lessons have no organization_id column */
        course_id: data.course_id,
        module_id: data.module_id,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'article',
        position: data.position ?? 0,
      })
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return res;
  }

  async getLesson(id: string): Promise<any | null> {
    const { data, error } = await this.db.from('lessons').select('*').eq('id', id).maybeSingle();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return data;
  }

  async updateLesson(id: string, expectedVersion: number, updates: { title?: string; description?: string }): Promise<any> {
    const current = await this.getLesson(id);
    if (!current) throw new HttpError(404, 'not_found', `Lesson ${id} not found`);
    if (current.version !== expectedVersion) {
      throw new HttpError(409, 'version_conflict', `Version conflict on lesson ${id}: expected ${expectedVersion}, got ${current.version}`);
    }
    const { data, error } = await this.db
      .from('lessons')
      .update({
        ...updates,
        version: current.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return data;
  }

  async deleteLesson(id: string): Promise<void> {
    await this.db.from('content_locks').delete().eq('entity_type', 'lesson').eq('entity_id', id);
    const { error } = await this.db.from('lessons').delete().eq('id', id);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async restoreLesson(snapshot: any): Promise<void> {
    const { error } = await this.db.from('lessons').upsert(snapshot);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async createLessonItem(data: {
    id?: string;
    organization_id: string;
    course_id: string;
    lesson_id: string;
    kind: string;
    slot?: string;
    title?: string | null;
    payload: any;
    source_refs?: any[];
    provenance?: string;
    position?: number;
    created_by?: string;
  }): Promise<{ id: string }> {
    const { data: res, error } = await this.db
      .from('lesson_items')
      .insert({
        ...(data.id ? { id: data.id } : {}),
        organization_id: data.organization_id,
        course_id: data.course_id,
        lesson_id: data.lesson_id,
        kind: data.kind,
        slot: data.slot ?? 'main',
        title: data.title ?? null,
        payload: data.payload,
        source_refs: data.source_refs ?? [],
        provenance: data.provenance ?? 'instructor',
        position: data.position ?? 0,
        created_by: data.created_by ?? null,
      })
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return res;
  }

  async getLessonItem(id: string): Promise<any | null> {
    const { data, error } = await this.db.from('lesson_items').select('*').eq('id', id).maybeSingle();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return data;
  }

  async updateLessonItem(
    id: string,
    expectedVersion: number,
    updates: { title?: string | null; payload?: any; source_refs?: any[] }
  ): Promise<any> {
    const current = await this.getLessonItem(id);
    if (!current) throw new HttpError(404, 'not_found', `Lesson item ${id} not found`);
    if (current.version !== expectedVersion) {
      throw new HttpError(409, 'version_conflict', `Version conflict on item ${id}: expected ${expectedVersion}, got ${current.version}`);
    }
    const { data, error } = await this.db
      .from('lesson_items')
      .update({
        ...updates,
        version: current.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return data;
  }

  async archiveLessonItem(id: string): Promise<void> {
    await this.db.from('content_locks').delete().eq('entity_type', 'lesson_item').eq('entity_id', id);
    const { error } = await this.db
      .from('lesson_items')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async restoreLessonItem(snapshot: any): Promise<void> {
    const { error } = await this.db.from('lesson_items').upsert(snapshot);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async deleteLessonItem(id: string): Promise<void> {
    await this.db.from('content_locks').delete().eq('entity_type', 'lesson_item').eq('entity_id', id);
    const { error } = await this.db.from('lesson_items').delete().eq('id', id);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async getContentLock(entityType: string, entityId: string): Promise<any | null> {
    const { data, error } = await this.db
      .from('content_locks')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle();
    if (error) throw new HttpError(500, 'db_error', error.message);
    return data;
  }

  async upsertContentLock(data: {
    organization_id: string;
    course_id: string;
    entity_type: string;
    entity_id: string;
    rule: any;
    message?: string | null;
    created_by?: string;
  }): Promise<void> {
    const { error } = await this.db.from('content_locks').upsert(
      {
        organization_id: data.organization_id,
        course_id: data.course_id,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        rule: data.rule,
        message: data.message ?? null,
        created_by: data.created_by ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'entity_type,entity_id' }
    );
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async deleteContentLock(entityType: string, entityId: string): Promise<void> {
    const { error } = await this.db
      .from('content_locks')
      .delete()
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
    if (error) throw new HttpError(500, 'db_error', error.message);
  }

  async restoreContentLock(snapshot: any): Promise<void> {
    const { error } = await this.db.from('content_locks').upsert(snapshot, { onConflict: 'entity_type,entity_id' });
    if (error) throw new HttpError(500, 'db_error', error.message);
  }
}

export function getRepo(db: any): KateRepository {
  if (db && typeof db === 'object' && db.isKateRepo) {
    return db as KateRepository;
  }
  return new SupabaseKateRepository(db);
}

export function generateOpSummary(op: ChangeOp): string {
  switch (op.op) {
    case 'create_module':
      return `Create module "${op.title}"`;
    case 'create_lesson':
      return `Create lesson "${op.title}"`;
    case 'create_item': {
      if (op.kind === 'quiz' && op.payload && op.payload.kind === 'quiz') {
        const count = op.payload.questions?.length ?? 0;
        return `Create quiz "${op.title || 'Untitled'}" (${count} question${count === 1 ? '' : 's'})`;
      }
      if (op.kind === 'flashcards' && op.payload && op.payload.kind === 'flashcards') {
        const count = op.payload.cards?.length ?? 0;
        return `Create flashcards "${op.title || 'Untitled'}" (${count} card${count === 1 ? '' : 's'})`;
      }
      return `Create ${op.kind} "${op.title || op.kind}"`;
    }
    case 'update_item':
      return `Update item "${op.title ?? op.itemId}"`;
    case 'update_lesson':
      return `Update lesson "${op.title ?? op.lessonId}"`;
    case 'archive_item':
      return `Archive item "${op.itemId}"`;
    case 'set_lock': {
      const rule = op.rule;
      if (rule.type === 'manual') {
        return `Lock ${op.entityType} manually`;
      } else if (rule.type === 'after_previous') {
        return `Lock ${op.entityType} until the previous lesson is complete`;
      } else if (rule.type === 'after_lesson') {
        return `Lock ${op.entityType} until lesson is complete`;
      } else if (rule.type === 'after_quiz') {
        return `Lock ${op.entityType} until quiz is passed (${rule.minScore}%)`;
      } else if (rule.type === 'min_level') {
        return `Lock ${op.entityType} until student reaches level ${rule.level}`;
      } else if (rule.type === 'date') {
        return `Lock ${op.entityType} until ${rule.at}`;
      }
      return `Lock ${op.entityType}`;
    }
    case 'remove_lock':
      return `Remove lock on ${op.entityType}`;
    default:
      return 'Modify content';
  }
}

export async function saveDraft(
  deps: KateDeps,
  draft: ChangeSetDraft,
  threadId?: string
): Promise<ChangeSetView> {
  const repo = getRepo(deps.db);
  const changeSetId = crypto.randomUUID();
  const now = new Date().toISOString();

  const descriptionData = JSON.stringify({
    summary: draft.summary,
    audit: draft.audit,
  });

  const csRecord: DBChangeSet = {
    id: changeSetId,
    organization_id: deps.organizationId,
    course_id: draft.courseId,
    title: draft.title,
    description: descriptionData,
    status: 'proposed',
    thread_id: threadId ?? null,
    created_by: deps.userId,
    created_at: now,
    updated_at: now,
    applied_at: null,
    reverted_at: null,
  };

  await repo.insertChangeSet(csRecord);

  const items: DBChangeSetItem[] = draft.ops.map((op, idx) => {
    let entityType = 'lesson_item';
    let entityId = crypto.randomUUID() as string;

    if (op.op === 'create_module') {
      entityType = 'module';
      entityId = crypto.randomUUID() as string;
    } else if (op.op === 'create_lesson') {
      entityType = 'lesson';
      entityId = crypto.randomUUID() as string;
    } else if (op.op === 'create_item') {
      entityType = 'lesson_item';
      entityId = crypto.randomUUID() as string;
    } else if (op.op === 'update_item') {
      entityType = 'lesson_item';
      entityId = op.itemId;
    } else if (op.op === 'update_lesson') {
      entityType = 'lesson';
      entityId = op.lessonId;
    } else if (op.op === 'archive_item') {
      entityType = 'lesson_item';
      entityId = op.itemId;
    } else if (op.op === 'set_lock' || op.op === 'remove_lock') {
      entityType = op.entityType;
      entityId = op.entityId.startsWith('temp:') ? (crypto.randomUUID() as string) : op.entityId;
    }

    let operation: DBChangeSetItem['operation'] = 'update';
    if (op.op.startsWith('create')) {
      operation = 'create';
    } else if (op.op === 'archive_item') {
      operation = 'delete';
    } else if (op.op === 'set_lock') {
      operation = 'lock';
    } else if (op.op === 'remove_lock') {
      operation = 'unlock';
    }

    return {
      id: crypto.randomUUID(),
      change_set_id: changeSetId,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      position: idx,
      summary: generateOpSummary(op),
      before_snapshot: null,
      after_snapshot: op,
      status: 'proposed',
      applied_at: null,
    };
  });

  if (items.length > 0) {
    await repo.insertChangeSetItems(items);
  }

  return getView(deps, changeSetId);
}

export async function getView(deps: KateDeps, id: string): Promise<ChangeSetView> {
  const repo = getRepo(deps.db);
  const cs = await repo.getChangeSet(id);
  if (!cs) {
    throw new HttpError(404, 'not_found', `Change set ${id} not found`);
  }

  const items = await repo.getChangeSetItems(id);

  let summary: string | null = null;
  let audit: ChangeSetDraft['audit'] | undefined = undefined;

  if (cs.description) {
    try {
      const parsed = JSON.parse(cs.description);
      if (typeof parsed === 'object' && parsed !== null) {
        summary = parsed.summary ?? cs.description;
        audit = parsed.audit;
      } else {
        summary = cs.description;
      }
    } catch {
      summary = cs.description;
    }
  }

  const opsWithSummary = items.map((item) => {
    const op = item.after_snapshot as ChangeOp;
    const opSummary = item.summary || generateOpSummary(op);
    return {
      ...op,
      summary: opSummary,
    };
  });

  return {
    id: cs.id,
    courseId: cs.course_id,
    title: cs.title,
    summary,
    status: cs.status,
    ops: opsWithSummary,
    audit,
    createdAt: cs.created_at,
    appliedAt: cs.applied_at ?? null,
  };
}

export async function apply(
  deps: KateDeps,
  id: string,
  options?: { overrideAudit?: boolean }
): Promise<{ changeSet: ChangeSetView; created: Record<string, string> }> {
  const repo = getRepo(deps.db);
  const csView = await getView(deps, id);

  if (csView.status === 'applied') {
    return { changeSet: csView, created: {} };
  }
  if (csView.status === 'reverted' || csView.status === 'rejected') {
    throw new HttpError(400, 'invalid_state', `Cannot apply change set in status '${csView.status}'`);
  }

  if (csView.audit && csView.audit.passed === false && !options?.overrideAudit) {
    throw new HttpError(400, 'audit_failed', 'Audit failed and overrideAudit was not provided', {
      details: { audit: csView.audit },
    });
  }

  const items = await repo.getChangeSetItems(id);
  const created: Record<string, string> = {};

  const resolveId = (targetId: string): string => {
    if (!targetId) return targetId;
    if (targetId.startsWith('temp:')) {
      const key = targetId.slice(5);
      return created[key] || created[targetId] || targetId;
    }
    return created[targetId] || targetId;
  };

  const rollbackStack: Array<{ itemId: string; undo: () => Promise<void> }> = [];

  try {
    for (const item of items) {
      const op = item.after_snapshot as ChangeOp;
      const now = new Date().toISOString();

      if (op.op === 'create_module') {
        const result = await repo.createModule({
          organization_id: deps.organizationId,
          course_id: csView.courseId,
          title: op.title,
          description: op.description ?? null,
          position: op.position ?? 0,
        });
        const realId = result.id;
        created[op.tempId] = realId;

        await repo.updateChangeSetItem(item.id, {
          entity_id: realId,
          before_snapshot: null,
          status: 'applied',
          applied_at: now,
        });

        rollbackStack.push({
          itemId: item.id,
          undo: async () => {
            await repo.deleteModule(realId);
          },
        });
      } else if (op.op === 'create_lesson') {
        const moduleId = resolveId(op.moduleId);
        const result = await repo.createLesson({
          organization_id: deps.organizationId,
          course_id: csView.courseId,
          module_id: moduleId,
          title: op.title,
          description: op.description ?? null,
          type: op.type ?? 'article',
          position: op.position ?? 0,
        });
        const realId = result.id;
        created[op.tempId] = realId;

        await repo.updateChangeSetItem(item.id, {
          entity_id: realId,
          before_snapshot: null,
          status: 'applied',
          applied_at: now,
        });

        rollbackStack.push({
          itemId: item.id,
          undo: async () => {
            await repo.deleteLesson(realId);
          },
        });
      } else if (op.op === 'create_item') {
        const lessonId = resolveId(op.lessonId);
        const result = await repo.createLessonItem({
          organization_id: deps.organizationId,
          course_id: csView.courseId,
          lesson_id: lessonId,
          kind: op.kind,
          slot: op.slot,
          title: op.title,
          payload: op.payload,
          source_refs: op.sourceRefs,
          provenance: op.provenance,
          position: op.position ?? 0,
          created_by: deps.userId,
        });
        const realId = result.id;
        created[op.tempId] = realId;

        await repo.updateChangeSetItem(item.id, {
          entity_id: realId,
          before_snapshot: null,
          status: 'applied',
          applied_at: now,
        });

        rollbackStack.push({
          itemId: item.id,
          undo: async () => {
            await repo.deleteLessonItem(realId);
          },
        });
      } else if (op.op === 'update_item') {
        const realItemId = resolveId(op.itemId);
        const before = await repo.getLessonItem(realItemId);
        if (!before) {
          throw new HttpError(404, 'not_found', `Lesson item ${realItemId} not found`);
        }

        if (typeof before.version === 'number' && before.version !== op.expectedVersion) {
          throw new HttpError(409, 'version_conflict', `Version conflict on item ${realItemId}: expected ${op.expectedVersion}, got ${before.version}`);
        }

        await repo.updateLessonItem(realItemId, op.expectedVersion, {
          title: op.title ?? before.title,
          payload: op.payload ?? before.payload,
          source_refs: op.sourceRefs ?? before.source_refs,
        });

        await repo.updateChangeSetItem(item.id, {
          entity_id: realItemId,
          before_snapshot: before,
          status: 'applied',
          applied_at: now,
        });

        rollbackStack.push({
          itemId: item.id,
          undo: async () => {
            await repo.restoreLessonItem(before);
          },
        });
      } else if (op.op === 'update_lesson') {
        const realLessonId = resolveId(op.lessonId);
        const before = await repo.getLesson(realLessonId);
        if (!before) {
          throw new HttpError(404, 'not_found', `Lesson ${realLessonId} not found`);
        }

        if (typeof before.version === 'number' && before.version !== op.expectedVersion) {
          throw new HttpError(409, 'version_conflict', `Version conflict on lesson ${realLessonId}: expected ${op.expectedVersion}, got ${before.version}`);
        }

        await repo.updateLesson(realLessonId, op.expectedVersion, {
          title: op.title ?? before.title,
          description: op.description ?? before.description,
        });

        await repo.updateChangeSetItem(item.id, {
          entity_id: realLessonId,
          before_snapshot: before,
          status: 'applied',
          applied_at: now,
        });

        rollbackStack.push({
          itemId: item.id,
          undo: async () => {
            await repo.restoreLesson(before);
          },
        });
      } else if (op.op === 'archive_item') {
        const realItemId = resolveId(op.itemId);
        const before = await repo.getLessonItem(realItemId);
        if (!before) {
          throw new HttpError(404, 'not_found', `Lesson item ${realItemId} not found`);
        }

        await repo.archiveLessonItem(realItemId);

        await repo.updateChangeSetItem(item.id, {
          entity_id: realItemId,
          before_snapshot: before,
          status: 'applied',
          applied_at: now,
        });

        rollbackStack.push({
          itemId: item.id,
          undo: async () => {
            await repo.restoreLessonItem(before);
          },
        });
      } else if (op.op === 'set_lock') {
        const realEntityId = resolveId(op.entityId);
        const before = await repo.getContentLock(op.entityType, realEntityId);

        await repo.upsertContentLock({
          organization_id: deps.organizationId,
          course_id: csView.courseId,
          entity_type: op.entityType,
          entity_id: realEntityId,
          rule: op.rule,
          message: op.message ?? null,
          created_by: deps.userId,
        });

        await repo.updateChangeSetItem(item.id, {
          entity_id: realEntityId,
          before_snapshot: before,
          status: 'applied',
          applied_at: now,
        });

        rollbackStack.push({
          itemId: item.id,
          undo: async () => {
            if (before) {
              await repo.restoreContentLock(before);
            } else {
              await repo.deleteContentLock(op.entityType, realEntityId);
            }
          },
        });
      } else if (op.op === 'remove_lock') {
        const realEntityId = resolveId(op.entityId);
        const before = await repo.getContentLock(op.entityType, realEntityId);

        await repo.deleteContentLock(op.entityType, realEntityId);

        await repo.updateChangeSetItem(item.id, {
          entity_id: realEntityId,
          before_snapshot: before,
          status: 'applied',
          applied_at: now,
        });

        rollbackStack.push({
          itemId: item.id,
          undo: async () => {
            if (before) {
              await repo.restoreContentLock(before);
            }
          },
        });
      }
    }
  } catch (err) {
    for (let i = rollbackStack.length - 1; i >= 0; i--) {
      const entry = rollbackStack[i];
      try {
        await entry.undo();
        await repo.updateChangeSetItem(entry.itemId, {
          status: 'proposed',
          applied_at: null,
        });
      } catch {
        // keep rolling back
      }
    }
    throw err;
  }

  const now = new Date().toISOString();
  await repo.updateChangeSetStatus(id, 'applied', 'applied_at', now);

  const updatedCs = await getView(deps, id);
  return { changeSet: updatedCs, created };
}

export async function revert(deps: KateDeps, id: string): Promise<{ changeSet: ChangeSetView }> {
  const repo = getRepo(deps.db);
  const csView = await getView(deps, id);

  if (csView.status !== 'applied') {
    throw new HttpError(400, 'invalid_state', `Cannot revert change set in status '${csView.status}' (must be 'applied')`);
  }

  const items = await repo.getChangeSetItems(id);

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const op = item.after_snapshot as ChangeOp;
    const realEntityId = item.entity_id;

    if (op.op === 'create_module') {
      if (realEntityId) {
        await repo.deleteModule(realEntityId);
      }
    } else if (op.op === 'create_lesson') {
      if (realEntityId) {
        await repo.deleteLesson(realEntityId);
      }
    } else if (op.op === 'create_item') {
      if (realEntityId) {
        await repo.archiveLessonItem(realEntityId);
      }
    } else if (op.op === 'update_item') {
      if (item.before_snapshot) {
        await repo.restoreLessonItem(item.before_snapshot);
      }
    } else if (op.op === 'update_lesson') {
      if (item.before_snapshot) {
        await repo.restoreLesson(item.before_snapshot);
      }
    } else if (op.op === 'archive_item') {
      if (item.before_snapshot) {
        await repo.restoreLessonItem(item.before_snapshot);
      }
    } else if (op.op === 'set_lock') {
      if (item.before_snapshot) {
        await repo.restoreContentLock(item.before_snapshot);
      } else if (realEntityId) {
        await repo.deleteContentLock(op.entityType, realEntityId);
      }
    } else if (op.op === 'remove_lock') {
      if (item.before_snapshot) {
        await repo.restoreContentLock(item.before_snapshot);
      }
    }

    await repo.updateChangeSetItem(item.id, {
      status: 'reverted',
    });
  }

  const now = new Date().toISOString();
  await repo.updateChangeSetStatus(id, 'reverted', 'reverted_at', now);

  const updatedCs = await getView(deps, id);
  return { changeSet: updatedCs };
}
