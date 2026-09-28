import type { KateChecklist, ChangeSetDraft, GeneratorInput, KateActionId } from '../../shared/kate/types.js';
import type { AiRequestLogger } from '../ai/logger.js';
import type { ORFetch } from '../ai/providers/openrouter.js';

export interface KateDeps {
  db: any;
  organizationId: string;
  userId: string;
  chat?: ORFetch;
  logger?: AiRequestLogger;
}

export interface KatePorts {
  saveDraft: (deps: KateDeps, draft: ChangeSetDraft, threadId?: string) => Promise<{ id: string }>;
  getGenerator: (action: KateActionId) => {
    generate: (input: GeneratorInput, deps: KateDeps) => Promise<ChangeSetDraft>;
  };
  getChecklistBuilder: () => {
    buildChecklist: (sourceIds: string[], deps: KateDeps) => Promise<KateChecklist>;
  };
}
