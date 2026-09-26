import { serverEnv } from '../env.js';
import type { AiTier } from '../../shared/ai/types.js';

export type { AiTier };

export interface TierDefaults {
  modelKind: 'chat' | 'reasoning';
  temperature?: number;
  maxTokens: number;
  timeoutMs: number;
}

export const TIER_DEFAULTS: Record<AiTier, TierDefaults> = {
  LIGHT: {
    modelKind: 'chat',
    temperature: 0.3,
    maxTokens: 1500,
    timeoutMs: 60000,
  },
  STANDARD: {
    modelKind: 'chat',
    temperature: 0.5,
    maxTokens: 4000,
    timeoutMs: 120000,
  },
  HIGH: {
    modelKind: 'chat',
    temperature: 0.4,
    maxTokens: 8000,
    timeoutMs: 180000,
  },
  MAX: {
    modelKind: 'reasoning',
    maxTokens: 8000,
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
