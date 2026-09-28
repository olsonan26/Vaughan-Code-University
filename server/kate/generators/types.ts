import type { SupabaseClient } from '@supabase/supabase-js';
import type { openRouterChat } from '../../ai/providers/openrouter.js';
import type { ChangeSetDraft, GeneratorInput, KateChecklist } from '../../../shared/kate/types.js';
import type * as retrievalModule from '../retrieval.js';

export interface GeneratorDeps {
  db: SupabaseClient;
  organizationId: string;
  userId: string;
  chat: typeof openRouterChat;
  logger?: any;
  retrieval?: typeof retrievalModule;
}

export type GeneratorFn = (input: GeneratorInput, deps: GeneratorDeps) => Promise<ChangeSetDraft>;
