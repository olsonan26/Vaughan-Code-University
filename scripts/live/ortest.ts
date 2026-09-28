import { openRouterChat, KATE_MODELS } from '../../server/ai/providers/openrouter.js';
import { readFileSync } from 'fs';
const img = 'data:image/png;base64,' + readFileSync('/tmp/hard_chart.png').toString('base64');
const r = await openRouterChat({ model: KATE_MODELS.eyesPrimary, reasoning: 'off', maxTokens: 800, messages: [{ role: 'user', content: [{ type: 'text', text: 'Transcribe the table rows only.' }, { type: 'image_url', image_url: { url: img } }] }] });
console.log('eyes', r.model, r.costUsd, r.text.slice(0, 160).replace(/\n/g, ' | '));
const t = await openRouterChat({ model: KATE_MODELS.chat, maxTokens: 300, messages: [{ role: 'system', content: 'You are Kate.' }, { role: 'user', content: 'List lessons in module 1' }],
  tools: [{ type: 'function', function: { name: 'list_classroom', description: 'List courses, modules, lessons', parameters: { type: 'object', properties: { courseCode: { type: 'string' } } } } }] });
console.log('tools', t.finishReason, JSON.stringify(t.toolCalls).slice(0, 200));
