/** Builds Kate deps for a request: service DB client + an OpenRouter chat that logs cost/usage to ai_requests. */
import type { AuthContext } from '../context.js';
import { getServiceClient } from '../lib/supabase.js';
import { createSupabaseAiLogger } from '../ai/logger.js';
import { openRouterChat, type ORRequest } from '../ai/providers/openrouter.js';

export function kateDeps(auth: Pick<AuthContext, 'organizationId' | 'userId'>, skill = 'kate') {
  const db = getServiceClient();
  const logger = createSupabaseAiLogger(db);
  const chat = async (req: ORRequest) => {
    const started = Date.now();
    try {
      const res = await openRouterChat(req);
      await logger.log({ organization_id: auth.organizationId, user_id: auth.userId, skill, prompt_version: 'kate-v1', provider: 'openrouter', model: res.model, tier: 'LOW' as any, status: 'success', input_tokens: res.usage.inputTokens, output_tokens: res.usage.outputTokens, cached_tokens: 0, latency_ms: res.latencyMs, estimated_cost_usd: res.costUsd ?? 0 }).catch(() => {});
      return res;
    } catch (e: any) {
      await logger.log({ organization_id: auth.organizationId, user_id: auth.userId, skill, prompt_version: 'kate-v1', provider: 'openrouter', model: req.model, tier: 'LOW' as any, status: 'error', error: String(e?.message ?? e).slice(0, 500), input_tokens: 0, output_tokens: 0, cached_tokens: 0, latency_ms: Date.now() - started, estimated_cost_usd: 0 }).catch(() => {});
      throw e;
    }
  };
  return { db, organizationId: auth.organizationId, userId: auth.userId, chat: chat as typeof openRouterChat };
}
