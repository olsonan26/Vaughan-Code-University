import { serverEnv } from '../../env.js';
import {
  AiNotConfiguredError,
  AiTimeoutError,
  AiRateLimitError,
  AiProviderError,
} from '../errors.js';
import type { ChatProvider, ChatRequest, ChatResponse } from './types.js';

export interface DeepSeekProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  sleepImpl?: (ms: number) => Promise<void>;
}

export function createDeepSeekProvider(options: DeepSeekProviderOptions = {}): ChatProvider {
  const apiKey = options.apiKey ?? serverEnv.deepseekApiKey;
  const baseUrl = (options.baseUrl ?? serverEnv.deepseekBaseUrl).replace(/\/$/, '');
  const defaultModel = options.defaultModel ?? serverEnv.deepseekModel;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const maxRetries = options.maxRetries ?? 3;
  const sleepImpl = options.sleepImpl ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  return {
    name: 'deepseek',

    async chat(req: ChatRequest): Promise<ChatResponse> {
      if (!apiKey) {
        throw new AiNotConfiguredError('DeepSeek is not configured: set DEEPSEEK_API_KEY on the server');
      }

      const model = req.model || defaultModel;
      const isReasoner = /reasoner/i.test(model);

      let systemContent = req.system;
      if (req.json && !/json/i.test(systemContent)) {
        systemContent = `${systemContent} Respond with valid JSON only.`;
      }

      const messages = [
        { role: 'system', content: systemContent },
        ...req.messages,
      ];

      const body: Record<string, unknown> = {
        model,
        messages,
      };

      if (!isReasoner) {
        if (req.temperature !== undefined) {
          body.temperature = req.temperature;
        }
        if (req.json) {
          body.response_format = { type: 'json_object' };
        }
      }

      if (req.maxTokens !== undefined) {
        body.max_tokens = req.maxTokens;
      }

      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (req.timeoutMs) {
        timeoutId = setTimeout(() => {
          controller.abort();
        }, req.timeoutMs);
      }

      if (req.signal) {
        if (req.signal.aborted) {
          controller.abort();
        } else {
          req.signal.addEventListener('abort', () => controller.abort());
        }
      }

      try {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          const startTime = Date.now();
          let response: Response;

          try {
            response = await fetchImpl(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(body),
              signal: controller.signal,
            });
          } catch (err: any) {
            if (err?.name === 'AbortError' || controller.signal.aborted) {
              throw new AiTimeoutError();
            }
            if (attempt < maxRetries) {
              const backoff = Math.pow(2, attempt) * 500 + Math.random() * 100;
              await sleepImpl(backoff);
              continue;
            }
            throw new AiProviderError(500, true, `Network error: ${err?.message || String(err)}`);
          }

          if (response.ok) {
            const data = await response.json();
            const latencyMs = Date.now() - startTime;
            const choice = data.choices?.[0];
            const text = choice?.message?.content ?? '';
            const finishReason = choice?.finish_reason;

            const usage = {
              inputTokens: data.usage?.prompt_tokens ?? 0,
              outputTokens: data.usage?.completion_tokens ?? 0,
              cachedTokens:
                data.usage?.prompt_cache_hit_tokens ??
                data.usage?.prompt_tokens_details?.cached_tokens ??
                undefined,
            };

            return {
              text,
              model: data.model || model,
              usage,
              latencyMs,
              finishReason,
            };
          }

          const status = response.status;

          if (status === 429) {
            if (attempt < maxRetries) {
              const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 200;
              await sleepImpl(backoff);
              continue;
            }
            throw new AiRateLimitError('DeepSeek rate limit exceeded');
          }

          if (status >= 500) {
            if (attempt < maxRetries) {
              const backoff = Math.pow(2, attempt) * 500 + Math.random() * 100;
              await sleepImpl(backoff);
              continue;
            }
            const errText = await response.text().catch(() => '');
            throw new AiProviderError(status, true, errText || `DeepSeek server error status ${status}`);
          }

          // 400, 401, 403, etc.
          const errText = await response.text().catch(() => '');
          if (status === 401) {
            throw new AiProviderError(401, false, 'The DeepSeek API key is invalid');
          }
          throw new AiProviderError(status, false, errText || `DeepSeek provider error status ${status}`);
        }

        throw new AiProviderError(500, true, 'Max retries exceeded');
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    },
  };
}
