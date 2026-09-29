import type { ChangeSetDraft, GeneratorInput, KateChecklist } from '../../shared/kate/types.js';
import type { GeneratorDeps } from './deps.js';

export class KateError extends Error {
  constructor(public code: string, message: string, public status: number = 400) {
    super(message);
    this.name = 'KateError';
  }
}

export type GeneratorFn = (input: GeneratorInput, deps: GeneratorDeps) => Promise<ChangeSetDraft>;
export type ChecklistBuilderFn = (sourceIds: string[], deps: GeneratorDeps) => Promise<KateChecklist>;

export interface RegistryOverrides {
  generators?: Record<string, { generate: GeneratorFn } | GeneratorFn>;
  checklistBuilder?: { buildChecklist: ChecklistBuilderFn } | ChecklistBuilderFn;
}

let overrides: RegistryOverrides | null = null;

export function setRegistryOverride(customOverrides: RegistryOverrides | null) {
  overrides = customOverrides;
}

export async function getGenerator(action: string): Promise<{ generate: GeneratorFn }> {
  if (overrides?.generators && action in overrides.generators) {
    const fnOrObj = overrides.generators[action];
    if (typeof fnOrObj === 'function') {
      return { generate: fnOrObj };
    } else if (fnOrObj && typeof fnOrObj.generate === 'function') {
      return fnOrObj;
    }
  }

  try {
    const mod: any = { generate: (await import('./generators/index.js')).GENERATORS[action] };
    if (mod && typeof mod.generate === 'function') {
      return { generate: mod.generate };
    }
  } catch (err: any) {
    throw new KateError('generator_unavailable', `Generator for action "${action}" is unavailable: ${err?.message || err}`);
  }

  throw new KateError('generator_unavailable', `Generator for action "${action}" is unavailable`);
}

export async function getChecklistBuilder(): Promise<{ buildChecklist: ChecklistBuilderFn }> {
  if (overrides?.checklistBuilder) {
    const fnOrObj = overrides.checklistBuilder;
    if (typeof fnOrObj === 'function') {
      return { buildChecklist: fnOrObj };
    } else if (fnOrObj && typeof fnOrObj.buildChecklist === 'function') {
      return fnOrObj;
    }
  }

  try {
    const mod: any = await import('./generators/index.js');
    if (mod && typeof mod.buildChecklist === 'function') {
      return { buildChecklist: mod.buildChecklist };
    }
  } catch (err: any) {
    throw new KateError('generator_unavailable', `Checklist builder is unavailable: ${err?.message || err}`);
  }

  throw new KateError('generator_unavailable', 'Checklist builder is unavailable');
}
