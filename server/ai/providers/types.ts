import type { TokenUsage } from '../../../shared/ai/types.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
  json?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Reasoning effort for models that think before answering (ignored where unsupported). */
  reasoning?: ReasoningEffort;
}

export type ReasoningEffort = 'off' | 'low' | 'medium' | 'high';

export interface ChatResponse {
  text: string;
  model: string;
  usage: TokenUsage;
  latencyMs: number;
  finishReason?: string;
  /** Exact cost reported by the provider (OpenRouter), when available. */
  costUsd?: number;
}

export interface ChatProvider {
  name: string;
  chat(req: ChatRequest): Promise<ChatResponse>;
}
