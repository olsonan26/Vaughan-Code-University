import type { GeneratorInput, ChangeSetDraft } from '../../../shared/kate/types.js';
import type { GeneratorDeps } from './types.js';
import { generate as reading } from './reading.js';

/** Beyond-source enrichment: only runs when the instructor explicitly approved it. Output is tagged as approved additions. */
export async function generate(input: GeneratorInput, deps: GeneratorDeps): Promise<ChangeSetDraft> {
  if (!input.allowBeyondSource) throw Object.assign(new Error('This idea goes beyond your source. Tick it and approve it first.'), { status: 400, code: 'needs_approval' });
  const approved = input.approvedAdditions?.length ? input.approvedAdditions : [input.instruction ?? ''];
  return reading({ ...input, approvedAdditions: approved }, deps);
}
