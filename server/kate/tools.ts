import { z } from 'zod';
import type { ORTool } from '../ai/providers/openrouter.js';
import type { KateDeps, KatePorts } from './agentPorts.js';
import type { ChangeSetDraft, KateActionId } from '../../shared/kate/types.js';
import type { LockRule, PlacementTarget } from '../../shared/classroom/types.js';
import { wrapUntrusted } from '../ai/untrusted.js';

export const placementTargetSchema = z.object({
  courseId: z.string(),
  moduleId: z.string(),
  newModuleTitle: z.string().optional(),
  lessonId: z.string(),
  newLessonTitle: z.string().optional(),
  kind: z.enum(['video', 'audio', 'pdf', 'reading', 'image', 'quiz', 'resource', 'flashcards', 'worksheet', 'lesson_plan']),
  slot: z.enum(['main', 'section', 'resource']),
  position: z.number().optional(),
  lock: z.object({
    rule: z.any(),
    message: z.string().optional(),
  }).nullable().optional(),
});

export const lockRuleSchema = z.record(z.unknown()).or(z.object({
  type: z.string(),
}));

export const kateActionEnum = z.enum([
  'quiz', 'flashcards', 'worksheet', 'lesson_plan', 'reading', 'lesson', 'module', 'course_map',
  'rewrite', 'transcript_cleanup', 'enrichment',
]);

export const toolSchemas = {
  list_classroom: z.object({
    courseId: z.string().optional(),
  }),
  list_sources: z.object({
    limit: z.number().int().optional().default(20),
  }),
  read_source: z.object({
    sourceId: z.string(),
    query: z.string().optional(),
  }),
  propose_checklist: z.object({
    sourceIds: z.array(z.string()),
  }),
  generate: z.object({
    action: kateActionEnum,
    sourceIds: z.array(z.string()),
    placement: placementTargetSchema,
    instruction: z.string().optional(),
    allowBeyondSource: z.boolean().optional().default(false),
  }),
  edit_item: z.object({
    itemId: z.string(),
    instruction: z.string(),
    sourceIds: z.array(z.string()).optional().default([]),
  }),
  set_lock: z.object({
    entityType: z.enum(['course', 'module', 'lesson', 'lesson_item']),
    entityId: z.string(),
    rule: lockRuleSchema,
    message: z.string().optional(),
  }),
  ask_placement: z.object({
    action: kateActionEnum,
    suggestion: z.object({
      courseId: z.string().optional(),
      moduleId: z.string().optional(),
      newModuleTitle: z.string().optional(),
      lessonId: z.string().optional(),
      newLessonTitle: z.string().optional(),
      kind: z.string().optional(),
      slot: z.string().optional(),
    }).optional(),
  }),
};

export const KATE_TOOLS: ORTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_classroom',
      description: 'List courses, modules, and lessons currently in the classroom',
      parameters: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Optional course ID to filter by' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_sources',
      description: 'List knowledge sources uploaded by the instructor',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum sources to return (default: 20)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_source',
      description: 'Read content or search chunks from a specific knowledge source',
      parameters: {
        type: 'object',
        properties: {
          sourceId: { type: 'string', description: 'Knowledge source ID' },
          query: { type: 'string', description: 'Optional text search query' },
        },
        required: ['sourceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_checklist',
      description: 'Analyze source materials and propose a checklist of course content Kate can create',
      parameters: {
        type: 'object',
        properties: {
          sourceIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of knowledge source IDs',
          },
        },
        required: ['sourceIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate',
      description: 'Generate course material change set (quiz, flashcards, lesson, module, worksheet, etc.)',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['quiz', 'flashcards', 'worksheet', 'lesson_plan', 'reading', 'lesson', 'module', 'course_map', 'rewrite', 'transcript_cleanup', 'enrichment'],
          },
          sourceIds: { type: 'array', items: { type: 'string' } },
          placement: {
            type: 'object',
            properties: {
              courseId: { type: 'string' },
              moduleId: { type: 'string' },
              newModuleTitle: { type: 'string' },
              lessonId: { type: 'string' },
              newLessonTitle: { type: 'string' },
              kind: { type: 'string', enum: ['video', 'audio', 'pdf', 'reading', 'image', 'quiz', 'resource', 'flashcards', 'worksheet', 'lesson_plan'] },
              slot: { type: 'string', enum: ['main', 'section', 'resource'] },
              position: { type: 'number' },
              lock: { type: 'object', nullable: true },
            },
            required: ['courseId', 'moduleId', 'lessonId', 'kind', 'slot'],
          },
          instruction: { type: 'string' },
          allowBeyondSource: { type: 'boolean' },
        },
        required: ['action', 'sourceIds', 'placement'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_item',
      description: 'Propose modifications to an existing item in the classroom',
      parameters: {
        type: 'object',
        properties: {
          itemId: { type: 'string' },
          instruction: { type: 'string' },
          sourceIds: { type: 'array', items: { type: 'string' } },
        },
        required: ['itemId', 'instruction'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_lock',
      description: 'Propose a lock rule for a course, module, lesson, or lesson_item as a change set (never applied directly)',
      parameters: {
        type: 'object',
        properties: {
          entityType: { type: 'string', enum: ['course', 'module', 'lesson', 'lesson_item'] },
          entityId: { type: 'string' },
          rule: { type: 'object' },
          message: { type: 'string' },
        },
        required: ['entityType', 'entityId', 'rule'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_placement',
      description: 'Ask the instructor to specify or confirm placement target for material when placement is unknown',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['quiz', 'flashcards', 'worksheet', 'lesson_plan', 'reading', 'lesson', 'module', 'course_map', 'rewrite', 'transcript_cleanup', 'enrichment'],
          },
          suggestion: { type: 'object' },
        },
        required: ['action'],
      },
    },
  },
];

export async function executeKateTool(
  name: string,
  rawArgs: unknown,
  deps: KateDeps,
  ports: KatePorts,
  threadId?: string,
): Promise<{ result?: any; error?: string }> {
  let parsedArgs = rawArgs;
  if (typeof rawArgs === 'string') {
    try {
      parsedArgs = JSON.parse(rawArgs);
    } catch (e: any) {
      return { error: `Invalid JSON arguments for tool ${name}: ${e.message}` };
    }
  }

  switch (name) {
    case 'list_classroom': {
      const v = toolSchemas.list_classroom.safeParse(parsedArgs);
      if (!v.success) return { error: `Validation error: ${v.error.message}` };
      try {
        let query = deps.db.from('courses').select('id, title, course_code, slug, description, position, modules(id, title, position, lessons(id, title, type, position))').eq('organization_id', deps.organizationId);
        if (v.data.courseId) query = query.eq('id', v.data.courseId);
        const { data, error } = await query;
        if (error) return { error: error.message };
        return { result: { courses: data || [] } };
      } catch (err: any) {
        return { error: err.message || String(err) };
      }
    }

    case 'list_sources': {
      const v = toolSchemas.list_sources.safeParse(parsedArgs);
      if (!v.success) return { error: `Validation error: ${v.error.message}` };
      try {
        const { data, error } = await deps.db.from('knowledge_sources')
          .select('id, title, type, original_filename, file_size_bytes, processing_state, page_count, chunk_count, created_at')
          .eq('organization_id', deps.organizationId)
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(v.data.limit);
        if (error) return { error: error.message };
        return { result: { sources: data || [] } };
      } catch (err: any) {
        return { error: err.message || String(err) };
      }
    }

    case 'read_source': {
      const v = toolSchemas.read_source.safeParse(parsedArgs);
      if (!v.success) return { error: `Validation error: ${v.error.message}` };
      try {
        let chunks: any[] = [];
        if (v.data.query) {
          const { data, error } = await deps.db.rpc('search_source_chunks_fts', {
            p_org: deps.organizationId,
            p_source_ids: [v.data.sourceId],
            p_query: v.data.query,
            p_match_count: 10,
          });
          if (!error && data && data.length > 0) {
            chunks = data;
          } else {
            const { data: fallback } = await deps.db.from('source_chunks')
              .select('id, chunk_index, page_number, section_title, content')
              .eq('source_id', v.data.sourceId)
              .ilike('content', `%${v.data.query}%`)
              .limit(10);
            chunks = fallback || [];
          }
        } else {
          const { data, error } = await deps.db.from('source_chunks')
            .select('id, chunk_index, page_number, section_title, content')
            .eq('source_id', v.data.sourceId)
            .order('chunk_index', { ascending: true })
            .limit(20);
          if (error) return { error: error.message };
          chunks = data || [];
        }

        const blocks = chunks.map((c: any) => ({
          label: `Chunk ${c.chunk_index} (page ${c.page_number ?? 'N/A'})`,
          text: c.content || '',
        }));
        const wrapped = wrapUntrusted(blocks);
        return { result: { sourceId: v.data.sourceId, chunkCount: chunks.length, content: wrapped } };
      } catch (err: any) {
        return { error: err.message || String(err) };
      }
    }

    case 'propose_checklist': {
      const v = toolSchemas.propose_checklist.safeParse(parsedArgs);
      if (!v.success) return { error: `Validation error: ${v.error.message}` };
      try {
        const checklist = await ports.getChecklistBuilder().buildChecklist(v.data.sourceIds, deps);
        return { result: { checklist } };
      } catch (err: any) {
        return { error: err.message || String(err) };
      }
    }

    case 'generate': {
      const v = toolSchemas.generate.safeParse(parsedArgs);
      if (!v.success) return { error: `Validation error: ${v.error.message}` };
      try {
        const generator = ports.getGenerator(v.data.action);
        const draft = await generator.generate({
          organizationId: deps.organizationId,
          userId: deps.userId,
          courseId: v.data.placement.courseId,
          sourceIds: v.data.sourceIds,
          instruction: v.data.instruction,
          placement: v.data.placement as PlacementTarget,
          allowBeyondSource: v.data.allowBeyondSource,
        }, deps);
        const saved = await ports.saveDraft(deps, draft, threadId);
        return { result: { changeSetId: saved.id, draft } };
      } catch (err: any) {
        return { error: err.message || String(err) };
      }
    }

    case 'edit_item': {
      const v = toolSchemas.edit_item.safeParse(parsedArgs);
      if (!v.success) return { error: `Validation error: ${v.error.message}` };
      try {
        const { data: item } = await deps.db.from('lesson_items').select('id, course_id, title, payload').eq('id', v.data.itemId).maybeSingle();
        const courseId = item?.course_id || '00000000-0000-0000-0000-000000000000';
        const draft: ChangeSetDraft = {
          title: `Edit item: ${item?.title || v.data.itemId}`,
          summary: v.data.instruction,
          courseId,
          ops: [{
            op: 'update_item',
            itemId: v.data.itemId,
            title: item?.title,
            payload: item?.payload,
            expectedVersion: 1,
          }],
        };
        const saved = await ports.saveDraft(deps, draft, threadId);
        return { result: { changeSetId: saved.id, draft } };
      } catch (err: any) {
        return { error: err.message || String(err) };
      }
    }

    case 'set_lock': {
      const v = toolSchemas.set_lock.safeParse(parsedArgs);
      if (!v.success) return { error: `Validation error: ${v.error.message}` };
      try {
        let courseId = '00000000-0000-0000-0000-000000000000';
        if (v.data.entityType === 'course') {
          courseId = v.data.entityId;
        } else if (v.data.entityType === 'module') {
          const { data } = await deps.db.from('modules').select('course_id').eq('id', v.data.entityId).maybeSingle();
          if (data?.course_id) courseId = data.course_id;
        } else if (v.data.entityType === 'lesson') {
          const { data } = await deps.db.from('lessons').select('course_id').eq('id', v.data.entityId).maybeSingle();
          if (data?.course_id) courseId = data.course_id;
        } else if (v.data.entityType === 'lesson_item') {
          const { data } = await deps.db.from('lesson_items').select('course_id').eq('id', v.data.entityId).maybeSingle();
          if (data?.course_id) courseId = data.course_id;
        }

        const draft: ChangeSetDraft = {
          title: `Set lock on ${v.data.entityType}`,
          summary: v.data.message || `Lock rule applied to ${v.data.entityType}`,
          courseId,
          ops: [{
            op: 'set_lock',
            entityType: v.data.entityType,
            entityId: v.data.entityId,
            rule: v.data.rule as LockRule,
            message: v.data.message,
          }],
        };
        const saved = await ports.saveDraft(deps, draft, threadId);
        return { result: { changeSetId: saved.id, draft } };
      } catch (err: any) {
        return { error: err.message || String(err) };
      }
    }

    case 'ask_placement': {
      const v = toolSchemas.ask_placement.safeParse(parsedArgs);
      if (!v.success) return { error: `Validation error: ${v.error.message}` };
      return {
        result: {
          placementRequest: {
            forAction: v.data.action,
            suggestion: v.data.suggestion,
          },
        },
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
