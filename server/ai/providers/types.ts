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
}

export interface ChatResponse {
  text: string;
  model: string;
  usage: TokenUsage;
  latencyMs: number;
  finishReason?: string;
}

export interface ChatProvider {
  name: string;
  chat(req: ChatRequest): Promise<ChatResponse>;
}
