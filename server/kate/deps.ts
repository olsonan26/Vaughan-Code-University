import type { openRouterChat } from '../ai/providers/openrouter.js';

export interface KateDeps {
  db: any;
  organizationId: string;
  userId: string;
  chat: typeof openRouterChat;
  logger?: any;
}

export type GeneratorDeps = KateDeps;
