import type { KateChecklist, KateMessageView, KateActionId } from '../../shared/kate/types.js';
import type { PlacementTarget } from '../../shared/classroom/types.js';

export interface KateThreadRecord {
  id: string;
  organizationId: string;
  userId: string;
  courseId?: string | null;
  sourceId?: string | null;
  title?: string | null;
  context?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface KateMessageRecord {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  data?: {
    checklist?: KateChecklist;
    changeSetId?: string;
    placementRequest?: { forAction: KateActionId; suggestion?: Partial<PlacementTarget> };
    lockQuestion?: { changeSetId: string };
    toolCalls?: any[];
    [key: string]: any;
  };
  createdAt: string;
}

export interface IKateRepository {
  createThread(params: {
    organizationId: string;
    userId: string;
    courseId?: string;
    sourceId?: string;
    title?: string;
    context?: Record<string, any>;
  }): Promise<KateThreadRecord>;

  getThread(threadId: string, organizationId: string): Promise<KateThreadRecord | null>;

  listThreads(organizationId: string, userId: string, limit?: number): Promise<KateThreadRecord[]>;

  addMessage(params: {
    threadId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    data?: Record<string, any>;
  }): Promise<KateMessageRecord>;

  getRawMessages(threadId: string, limit?: number): Promise<KateMessageRecord[]>;

  getMessagesView(threadId: string, limit?: number): Promise<KateMessageView[]>;
}

export function mapToKateMessageView(msg: KateMessageRecord): KateMessageView | null {
  if (msg.role !== 'user' && msg.role !== 'assistant') {
    return null;
  }
  const view: KateMessageView = {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt,
  };
  if (msg.data?.checklist) view.checklist = msg.data.checklist;
  if (msg.data?.changeSetId) view.changeSetId = msg.data.changeSetId;
  if (msg.data?.placementRequest) view.placementRequest = msg.data.placementRequest;
  if (msg.data?.lockQuestion) view.lockQuestion = msg.data.lockQuestion;
  return view;
}

export class SupabaseKateRepository implements IKateRepository {
  constructor(private db: any) {}

  async createThread(params: {
    organizationId: string;
    userId: string;
    courseId?: string;
    sourceId?: string;
    title?: string;
    context?: Record<string, any>;
  }): Promise<KateThreadRecord> {
    const { data, error } = await this.db
      .from('kate_threads')
      .insert({
        organization_id: params.organizationId,
        user_id: params.userId,
        course_id: params.courseId ?? null,
        source_id: params.sourceId ?? null,
        title: params.title ?? null,
        context: params.context ?? {},
      })
      .select('*')
      .single();

    if (error) throw new Error(`createThread failed: ${error.message}`);
    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      courseId: data.course_id,
      sourceId: data.source_id,
      title: data.title,
      context: data.context,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getThread(threadId: string, organizationId: string): Promise<KateThreadRecord | null> {
    const { data, error } = await this.db
      .from('kate_threads')
      .select('*')
      .eq('id', threadId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      organizationId: data.organization_id,
      userId: data.user_id,
      courseId: data.course_id,
      sourceId: data.source_id,
      title: data.title,
      context: data.context,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async listThreads(organizationId: string, userId: string, limit = 50): Promise<KateThreadRecord[]> {
    const { data, error } = await this.db
      .from('kate_threads')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((t: any) => ({
      id: t.id,
      organizationId: t.organization_id,
      userId: t.user_id,
      courseId: t.course_id,
      sourceId: t.source_id,
      title: t.title,
      context: t.context,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  }

  async addMessage(params: {
    threadId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    data?: Record<string, any>;
  }): Promise<KateMessageRecord> {
    const { data, error } = await this.db
      .from('kate_messages')
      .insert({
        thread_id: params.threadId,
        role: params.role,
        content: params.content,
        data: params.data ?? {},
      })
      .select('*')
      .single();

    if (error) throw new Error(`addMessage failed: ${error.message}`);

    // Update kate_threads updated_at
    await this.db.from('kate_threads').update({ updated_at: new Date().toISOString() }).eq('id', params.threadId);

    return {
      id: data.id,
      threadId: data.thread_id,
      role: data.role,
      content: data.content,
      data: data.data,
      createdAt: data.created_at,
    };
  }

  async getRawMessages(threadId: string, limit = 30): Promise<KateMessageRecord[]> {
    const { data, error } = await this.db
      .from('kate_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    const reversed = data.reverse();
    return reversed.map((m: any) => ({
      id: m.id,
      threadId: m.thread_id,
      role: m.role,
      content: m.content,
      data: m.data,
      createdAt: m.created_at,
    }));
  }

  async getMessagesView(threadId: string, limit = 100): Promise<KateMessageView[]> {
    const raw = await this.getRawMessages(threadId, limit);
    const views: KateMessageView[] = [];
    for (const msg of raw) {
      const v = mapToKateMessageView(msg);
      if (v) views.push(v);
    }
    return views;
  }
}

export class InMemoryKateRepository implements IKateRepository {
  public threads: Map<string, KateThreadRecord> = new Map();
  public messages: Map<string, KateMessageRecord[]> = new Map();

  async createThread(params: {
    organizationId: string;
    userId: string;
    courseId?: string;
    sourceId?: string;
    title?: string;
    context?: Record<string, any>;
  }): Promise<KateThreadRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const thread: KateThreadRecord = {
      id,
      organizationId: params.organizationId,
      userId: params.userId,
      courseId: params.courseId ?? null,
      sourceId: params.sourceId ?? null,
      title: params.title ?? null,
      context: params.context ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.threads.set(id, thread);
    this.messages.set(id, []);
    return thread;
  }

  async getThread(threadId: string, organizationId: string): Promise<KateThreadRecord | null> {
    const t = this.threads.get(threadId);
    if (!t || t.organizationId !== organizationId) return null;
    return t;
  }

  async listThreads(organizationId: string, userId: string, limit = 50): Promise<KateThreadRecord[]> {
    const list = Array.from(this.threads.values())
      .filter((t) => t.organizationId === organizationId && t.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
    return list;
  }

  async addMessage(params: {
    threadId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    data?: Record<string, any>;
  }): Promise<KateMessageRecord> {
    const msgs = this.messages.get(params.threadId) || [];
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const msg: KateMessageRecord = {
      id,
      threadId: params.threadId,
      role: params.role,
      content: params.content,
      data: params.data ?? {},
      createdAt: now,
    };
    msgs.push(msg);
    this.messages.set(params.threadId, msgs);

    const thread = this.threads.get(params.threadId);
    if (thread) {
      thread.updatedAt = now;
    }
    return msg;
  }

  async getRawMessages(threadId: string, limit = 30): Promise<KateMessageRecord[]> {
    const msgs = this.messages.get(threadId) || [];
    return msgs.slice(-limit);
  }

  async getMessagesView(threadId: string, limit = 100): Promise<KateMessageView[]> {
    const raw = await this.getRawMessages(threadId, limit);
    const views: KateMessageView[] = [];
    for (const msg of raw) {
      const v = mapToKateMessageView(msg);
      if (v) views.push(v);
    }
    return views;
  }
}
