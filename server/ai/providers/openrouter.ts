/**
 * Raw OpenRouter client for multimodal + tool-calling requests (Kate, eyes, ears, checker).
 * Text-only structured calls can keep using the gateway. Models: see docs/CLASSROOM_CONTRACT.md. No Gemini.
 */
import { AiNotConfiguredError, AiProviderError, AiRateLimitError, AiTimeoutError } from '../errors.js';

export const KATE_MODELS = {
  chat: 'deepseek/deepseek-v4.1-flash',
  writer: 'deepseek/deepseek-v4.1-flash',
  writerStrong: 'deepseek/deepseek-v4-pro',
  eyesPrimary: 'qwen/qwen3.7-flash',
  eyesCheck: 'qwen/qwen3.8-flash',
  ears: 'qwen/qwen3.8-omni-flash',
  checker: 'qwen/qwen3.8-flash',
} as const;

export type ORContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'input_audio'; input_audio: { data: string; format: string } };

export interface ORMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ORContentPart[] | null;
  tool_calls?: ORToolCall[];
  tool_call_id?: string;
  name?: string;
}
export interface ORToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
export interface ORTool { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }

export interface ORRequest {
  model: string;
  messages: ORMessage[];
  tools?: ORTool[];
  json?: boolean;
  /** 'off' disables thinking (REQUIRED for qwen3.7-flash, otherwise it can return empty content) */
  reasoning?: 'off' | 'low' | 'medium' | 'high';
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}
export interface ORResponse {
  text: string;
  toolCalls: ORToolCall[];
  model: string;
  finishReason: string | null;
  usage: { inputTokens: number; outputTokens: number };
  costUsd: number | null;
  latencyMs: number;
}

export type ORFetch = (req: ORRequest) => Promise<ORResponse>;

let override: ORFetch | null = null;
/** Tests: replace the network call with a scripted fake. */
export function setOpenRouterImpl(fn: ORFetch | null) { override = fn; }

export function openRouterConfigured() { return !!process.env.OPENROUTER_API_KEY || !!override; }

export async function openRouterChat(req: ORRequest): Promise<ORResponse> {
  if (override) return override(req);
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiNotConfiguredError('AI is not configured: set OPENROUTER_API_KEY on the server');
  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    max_tokens: req.maxTokens ?? 4000,
    usage: { include: true },
  };
  if (req.tools?.length) body.tools = req.tools;
  if (req.json) body.response_format = { type: 'json_object' };
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.reasoning) body.reasoning = req.reasoning === 'off' ? { enabled: false } : { effort: req.reasoning };

  const started = Date.now();
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), req.timeoutMs ?? 120_000);
    let res: Response;
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'https://vaughan-code-university.vercel.app', 'X-Title': 'Vaughan Code University Studio',
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e: any) {
      clearTimeout(t);
      if (e?.name === 'AbortError') throw new AiTimeoutError();
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 800 * (attempt + 1))); continue; }
      throw new AiProviderError(502, true, `Network error: ${e?.message ?? e}`);
    }
    // OpenRouter sends headers immediately and streams keep-alive padding while the
    // model works, so the timeout must also cover reading the body.
    let data: any;
    try {
      const raw = await res.text();
      data = raw.trim() ? JSON.parse(raw) : {};
    } catch (e: any) {
      clearTimeout(t);
      if (e?.name === 'AbortError' || ctrl.signal.aborted) throw new AiTimeoutError();
      data = {};
    }
    clearTimeout(t);
    if (res.status === 429) {
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
      throw new AiRateLimitError();
    }
    if (!res.ok || data.error || !data.choices?.[0]) {
      const retryable = res.status >= 500 || !data.choices;
      if (retryable && attempt < 2) { await new Promise((r) => setTimeout(r, 800 * (attempt + 1))); continue; }
      throw new AiProviderError(res.status || 502, retryable, `OpenRouter: ${data?.error?.message ?? res.statusText}`);
    }
    const choice = data.choices[0];
    return {
      text: choice.message?.content ?? '',
      toolCalls: choice.message?.tool_calls ?? [],
      model: data.model ?? req.model,
      finishReason: choice.finish_reason ?? null,
      usage: { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 },
      costUsd: typeof data.usage?.cost === 'number' ? data.usage.cost : null,
      latencyMs: Date.now() - started,
    };
  }
  throw new AiProviderError(502, true, 'OpenRouter: retries exhausted');
}

/** Parse a JSON answer, tolerating ```json fences. */
export function parseJsonLoose<T = unknown>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.search(/[\[{]/);
  return JSON.parse(start > 0 ? cleaned.slice(start) : cleaned) as T;
}
