/** Wires Kate's agent ports to the real change-set store and writers (static imports: bundles on Vercel). */
import type { KatePorts } from './agentPorts.js';
import { saveDraft } from './changeSets.js';
import { GENERATORS, buildChecklist } from './generators/index.js';
import { KateError } from './registry.js';

export const katePorts: KatePorts = {
  saveDraft: (deps, draft, threadId) => saveDraft(deps as any, draft, threadId),
  getGenerator: (action) => {
    const fn = GENERATORS[action];
    if (!fn) throw new KateError('generator_unavailable', `Kate can't do "${action}" yet`);
    return { generate: (input, deps) => fn(input, deps as any) };
  },
  getChecklistBuilder: () => ({ buildChecklist: (ids, deps) => buildChecklist(ids, deps as any) }),
};
