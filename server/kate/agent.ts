/** Kate's chat loop: DeepSeek V4.1 Flash with tools. Kate proposes change sets; the instructor applies them. */
import type { KateMessageView } from '../../shared/kate/types.js';
import type { KateDeps, KatePorts } from './agentPorts.js';
import type { IKateRepository } from './threads.js';
import { KATE_MODELS, openRouterChat, type ORMessage } from '../ai/providers/openrouter.js';
import { KATE_TOOLS, executeKateTool } from './tools.js';
import { KATE_SYSTEM_PROMPT } from './prompt.js';

export interface KateContext { courseId?: string; moduleId?: string; lessonId?: string; sourceIds?: string[]; placement?: unknown }

const MAX_ROUNDS = 6;

export async function runKate(deps: KateDeps, ports: KatePorts, repo: IKateRepository, threadId: string, content: string, context: KateContext = {}): Promise<KateMessageView[]> {
  const chat = deps.chat ?? openRouterChat;
  const history = await repo.getRawMessages(threadId, 30);
  const userMsg = await repo.addMessage({ threadId, role: 'user', content, data: Object.keys(context).length ? { context } : {} });

  const ctxLine = Object.keys(context).length ? `\n\nCurrent screen context (ids you can use): ${JSON.stringify(context)}` : '';
  const messages: ORMessage[] = [
    { role: 'system', content: KATE_SYSTEM_PROMPT + `\n\nTools: use list_classroom to find course/module/lesson ids, list_sources to find the instructor's uploads, read_source to quote them. To create material call generate with a full placement (courseId, moduleId or "new" + newModuleTitle, lessonId or "new" + newLessonTitle, kind, slot). If you don't know where it goes, call ask_placement. Never say something was added to the Classroom: say you prepared it and the instructor can review and click Apply.` + ctxLine },
    ...history.filter((m) => m.role !== 'tool').map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content },
  ];

  const data: Record<string, any> = {};
  let finalText = '';
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await chat({ model: KATE_MODELS.chat, messages, tools: KATE_TOOLS, maxTokens: 2500, temperature: 0.4 });
    if (!res.toolCalls.length) { finalText = res.text; break; }
    messages.push({ role: 'assistant', content: res.text || null, tool_calls: res.toolCalls });
    for (const call of res.toolCalls) {
      const out = await executeKateTool(call.function.name, call.function.arguments, deps, ports, threadId);
      const r = out.result ?? {};
      if (r.checklist) data.checklist = r.checklist;
      if (r.changeSetId) { data.changeSetId = r.changeSetId; data.lockQuestion = { changeSetId: r.changeSetId }; }
      if (r.placementRequest) data.placementRequest = r.placementRequest;
      const payload = out.error ? { error: out.error } : r.draft ? { changeSetId: r.changeSetId, title: r.draft.title, summary: r.draft.summary, audit: r.draft.audit ? { passed: r.draft.audit.passed, gaps: r.draft.audit.gaps } : undefined } : r;
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(payload).slice(0, 30000) });
      await repo.addMessage({ threadId, role: 'tool', content: `${call.function.name}`, data: { args: call.function.arguments, error: out.error ?? null } });
    }
    if (data.placementRequest && !data.changeSetId) {
      // The UI will ask the instructor; get a short line from Kate without more tools.
      const r2 = await chat({ model: KATE_MODELS.chat, messages: [...messages, { role: 'user', content: '(system: the placement picker is now shown to the instructor. Reply in one or two sentences asking where it should go.)' }], maxTokens: 300 });
      finalText = r2.text; break;
    }
  }
  if (!finalText) finalText = data.changeSetId ? 'I prepared that for you. Review it below and click Apply when it looks right.' : 'Sorry, I got stuck on that one. Could you rephrase or tell me which course and lesson you mean?';
  const assistant = await repo.addMessage({ threadId, role: 'assistant', content: finalText, data });
  const views = await repo.getMessagesView(threadId, 200);
  return views.filter((v) => v.id === userMsg.id || v.id === assistant.id);
}
