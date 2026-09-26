export type AiTier = 'LIGHT' | 'STANDARD' | 'HIGH' | 'MAX';

export interface TierConfig {
  model: 'chat' | 'reasoning';
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}

export interface AiMeta {
  provider: string;
  model: string;
  promptVersion: string;
  usage: TokenUsage;
  latencyMs: number;
  estimatedCostUsd: number;
  attempts: number;
}

export interface AiRequestContext {
  organizationId: string;
  userId: string;
  jobId?: string;
  jobStepId?: string;
  courseId?: string;
  lessonId?: string;
}

export interface UntrustedContext {
  label: string;
  text: string;
}
