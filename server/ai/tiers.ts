import { serverEnv } from '../env.js';
import type { AiTier } from '../../shared/ai/types.js';

export type { AiTier };

import type { ReasoningEffort } from './providers/types.js';

export interface TierDefaults {
  modelKind: 'chat' | 'reasoning';
  reasoning?: ReasoningEffort;
  temperature?: number;
  maxTokens: number;
  timeoutMs: number;
}

export const TIER_DEFAULTS: Record<AiTier, TierDefaults> = {
  LIGHT: {
    modelKind: 'chat',
    reasoning: 'off',
    temperature: 0.3,
    maxTokens: 4000,
    timeoutMs: 60000,
  },
  STANDARD: {
    modelKind: 'chat',
    reasoning: 'low',
    temperature: 0.5,
    maxTokens: 12000,
    timeoutMs: 120000,
  },
  HIGH: {
    // accuracy-critical work (knowledge analysis, architecture, audits): Flash with more thinking.
    // Live test 2026-09-28: Flash+medium matched Pro on concept extraction at ~1/20 the cost and half the time.
    modelKind: 'chat',
    reasoning: 'medium',
    temperature: 0.3,
    maxTokens: 16000,
    timeoutMs: 180000,
  },
  MAX: {
    modelKind: 'reasoning',
    reasoning: 'high',
    maxTokens: 16000,
    timeoutMs: 280000,
  },
};

export function resolveTier(tier: AiTier, overrides?: Partial<TierDefaults>): TierDefaults {
  const base = TIER_DEFAULTS[tier] ?? TIER_DEFAULTS.STANDARD;
  if (!overrides) return { ...base };
  return {
    ...base,
    ...overrides,
  };
}

export interface ModelOverrides {
  deepseekModel?: string;
  deepseekReasoningModel?: string;
}

export function resolveModel(tier: AiTier, settingsOverrides?: ModelOverrides): string {
  const tierConfig = resolveTier(tier);
  if (tierConfig.modelKind === 'reasoning') {
    return (
      settingsOverrides?.deepseekReasoningModel ||
      serverEnv.deepseekReasoningModel ||
      'deepseek-reasoner'
    );
  }
  return (
    settingsOverrides?.deepseekModel ||
    serverEnv.deepseekModel ||
    'deepseek-chat'
  );
}
