import { extractJson } from './json.js';
import { estimateCostUsd } from './pricing.js';
import { resolveTier, resolveModel, type AiTier, type TierDefaults } from './tiers.js';
import { AiOutputValidationError } from './errors.js';
import { wrapUntrusted } from './untrusted.js';
import { noopLogger, type AiRequestLogger, type AiRequestLogEntry } from './logger.js';
import { getChatProvider } from './providers/index.js';
import type { ChatProvider, ChatMessage } from './providers/types.js';
import type { SkillRequest } from './skills/types.js';

export interface RequestContext {
  organizationId: string;
  userId: string;
  jobId?: string;
  jobStepId?: string;
  courseId?: string;
  lessonId?: string;
}

export type StructuredRequest<T> = SkillRequest<T> & {
  context: RequestContext;
};

export interface GatewayResult<T> {
  data: T;
  meta: {
    provider: string;
    model: string;
    promptVersion: string;
    tier: AiTier;
    usage: {
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
    };
    latencyMs: number;
    estimatedCostUsd: number;
    attempts: number;
  };
}

export interface GatewayOptions {
  provider?: ChatProvider;
  logger?: AiRequestLogger;
  tierOverrides?: Partial<Record<AiTier, Partial<TierDefaults>>>;
}

export interface Gateway {
  providerName: string;
  generateStructured<T>(req: StructuredRequest<T>): Promise<GatewayResult<T>>;
}

export function createGateway(opts?: GatewayOptions): Gateway {
  const provider = opts?.provider ?? getChatProvider();
  const logger = opts?.logger ?? noopLogger;

  return {
    providerName: provider.name,

    async generateStructured<T>(req: StructuredRequest<T>): Promise<GatewayResult<T>> {
      const tierOverrides = opts?.tierOverrides?.[req.tier];
      const tierConfig = resolveTier(req.tier, tierOverrides);
      const model = resolveModel(req.tier);

      const untrustedFormatted =
        req.untrustedContext && req.untrustedContext.length > 0
          ? wrapUntrusted(req.untrustedContext)
          : '';

      const initialUserContent = untrustedFormatted
        ? `${req.userContent}\n\n${untrustedFormatted}`
        : req.userContent;

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCachedTokens = 0;
      let totalLatencyMs = 0;
      let attempts = 0;
      let resModel = model;

      const logHelper = async (status: 'success' | 'error', errorMsg?: string) => {
        const cost = estimateCostUsd(resModel, {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          cachedTokens: totalCachedTokens,
        });

        const logEntry: AiRequestLogEntry = {
          organization_id: req.context.organizationId,
          user_id: req.context.userId,
          job_id: req.context.jobId,
          job_step_id: req.context.jobStepId,
          skill: req.skill,
          prompt_version: req.promptVersion,
          provider: provider.name,
          model: resModel,
          tier: req.tier,
          status,
          error: errorMsg,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          cached_tokens: totalCachedTokens,
          latency_ms: totalLatencyMs,
          estimated_cost_usd: cost,
          course_id: req.context.courseId,
          lesson_id: req.context.lessonId,
          metadata: req.metadata,
        };

        await logger.log(logEntry);
      };

      // Attempt 1
      attempts = 1;
      const messages: ChatMessage[] = [{ role: 'user', content: initialUserContent }];

      let res;
      try {
        res = await provider.chat({
          system: req.system,
          messages,
          json: true,
          model,
          temperature: tierConfig.temperature,
          maxTokens: tierConfig.maxTokens,
          timeoutMs: tierConfig.timeoutMs,
        });
      } catch (err: any) {
        await logHelper('error', err?.message || String(err));
        throw err;
      }

      totalInputTokens += res.usage.inputTokens ?? 0;
      totalOutputTokens += res.usage.outputTokens ?? 0;
      totalCachedTokens += res.usage.cachedTokens ?? 0;
      totalLatencyMs += res.latencyMs ?? 0;
      resModel = res.model || model;

      let parseIssues: unknown = null;
      try {
        const parsedJson = extractJson<T>(res.text);
        const val = req.schema.safeParse(parsedJson);
        if (val.success) {
          await logHelper('success');
          const cost = estimateCostUsd(resModel, {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            cachedTokens: totalCachedTokens,
          });
          return {
            data: val.data,
            meta: {
              provider: provider.name,
              model: resModel,
              promptVersion: req.promptVersion,
              tier: req.tier,
              usage: {
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                cachedTokens: totalCachedTokens,
              },
              latencyMs: totalLatencyMs,
              estimatedCostUsd: cost,
              attempts: 1,
            },
          };
        } else {
          parseIssues = val.error.issues;
        }
      } catch (parseError: any) {
        parseIssues = parseError?.message || String(parseError);
      }

      // Repair attempt (Attempt 2)
      attempts = 2;
      const issueString = Array.isArray(parseIssues)
        ? parseIssues
            .map((i: any) => `${i.path ? i.path.join('.') : 'root'}: ${i.message}`)
            .join('\n')
        : String(parseIssues);

      const repairMessages: ChatMessage[] = [
        { role: 'user', content: initialUserContent },
        { role: 'assistant', content: res.text.slice(0, 4000) },
        {
          role: 'user',
          content: `The previous output was invalid. Validation issues:\n${issueString}\n\nReturn corrected JSON only.`,
        },
      ];

      let repairRes;
      try {
        repairRes = await provider.chat({
          system: req.system,
          messages: repairMessages,
          json: true,
          model,
          temperature: tierConfig.temperature,
          maxTokens: tierConfig.maxTokens,
          timeoutMs: tierConfig.timeoutMs,
        });
      } catch (err: any) {
        await logHelper('error', err?.message || String(err));
        throw err;
      }

      totalInputTokens += repairRes.usage.inputTokens ?? 0;
      totalOutputTokens += repairRes.usage.outputTokens ?? 0;
      totalCachedTokens += repairRes.usage.cachedTokens ?? 0;
      totalLatencyMs += repairRes.latencyMs ?? 0;
      resModel = repairRes.model || resModel;

      try {
        const parsedRepairJson = extractJson<T>(repairRes.text);
        const valRepair = req.schema.safeParse(parsedRepairJson);
        if (valRepair.success) {
          await logHelper('success');
          const cost = estimateCostUsd(resModel, {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            cachedTokens: totalCachedTokens,
          });
          return {
            data: valRepair.data,
            meta: {
              provider: provider.name,
              model: resModel,
              promptVersion: req.promptVersion,
              tier: req.tier,
              usage: {
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                cachedTokens: totalCachedTokens,
              },
              latencyMs: totalLatencyMs,
              estimatedCostUsd: cost,
              attempts: 2,
            },
          };
        } else {
          parseIssues = valRepair.error.issues;
        }
      } catch (parseError: any) {
        parseIssues = parseError?.message || String(parseError);
      }

      // If still invalid after repair
      const valError = new AiOutputValidationError(parseIssues, repairRes.text);
      await logHelper('error', valError.message);
      throw valError;
    },
  };
}
