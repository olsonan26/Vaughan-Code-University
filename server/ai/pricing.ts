import type { TokenUsage } from '../../shared/ai/types.js';

/**
 * ESTIMATED pricing per 1,000,000 tokens (in USD).
 * NOTE: These values are rough estimates for cost tracking and budget auditing.
 * Actual provider invoices may vary depending on promotions, tiers, or billing changes.
 */
export interface ModelPricing {
  inputUsdPerM: number;
  cachedInputUsdPerM: number;
  outputUsdPerM: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // DeepSeek-V3 / Chat
  'deepseek-chat': {
    inputUsdPerM: 0.14,
    cachedInputUsdPerM: 0.014,
    outputUsdPerM: 0.28,
  },
  // DeepSeek-R1 / Reasoner
  'deepseek-reasoner': {
    inputUsdPerM: 0.55,
    cachedInputUsdPerM: 0.14,
    outputUsdPerM: 2.19,
  },
  // Default fallback estimate
  default: {
    inputUsdPerM: 0.14,
    cachedInputUsdPerM: 0.014,
    outputUsdPerM: 0.28,
  },
};

/**
 * Calculates an ESTIMATED cost in USD for the given model and token usage.
 * Labels clearly in comments that this is an estimate.
 */
export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const modelKey = model.toLowerCase();
  let pricing = MODEL_PRICING[modelKey];

  if (!pricing) {
    if (modelKey.includes('reasoner')) {
      pricing = MODEL_PRICING['deepseek-reasoner'];
    } else if (modelKey.includes('chat') || modelKey.includes('deepseek')) {
      pricing = MODEL_PRICING['deepseek-chat'];
    } else {
      pricing = MODEL_PRICING.default;
    }
  }

  const cached = usage.cachedTokens ?? 0;
  const uncachedInput = Math.max(0, usage.inputTokens - cached);

  const inputCost = (uncachedInput * pricing.inputUsdPerM) / 1_000_000;
  const cachedCost = (cached * pricing.cachedInputUsdPerM) / 1_000_000;
  const outputCost = (usage.outputTokens * pricing.outputUsdPerM) / 1_000_000;

  // Round to 6 decimal places
  return Number((inputCost + cachedCost + outputCost).toFixed(6));
}
