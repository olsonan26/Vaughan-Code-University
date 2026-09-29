import { describe, it, expect, vi } from 'vitest';
import { createDeepSeekProvider } from '../providers/deepseek.js';
import { AiProviderError } from '../errors.js';

describe('DeepSeek Provider', () => {
  it('sends correct request shape (Authorization Bearer, model, response_format json_object, system message first)', async () => {
    let capturedUrl = '';
    let capturedOptions: any = null;

    const mockFetch = vi.fn(async (url: string | URL | Request, opts?: RequestInit) => {
      capturedUrl = String(url);
      capturedOptions = opts;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: '{"status": "ok"}' },
              finish_reason: 'stop',
            },
          ],
          model: 'deepseek-chat',
          usage: {
            prompt_tokens: 12,
            completion_tokens: 6,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const provider = createDeepSeekProvider({
      apiKey: 'sk-test-secret-key',
      baseUrl: 'https://api.deepseek.com',
      fetchImpl: mockFetch as any,
    });

    const res = await provider.chat({
      system: 'You are an assistant.',
      messages: [{ role: 'user', content: 'Hello' }],
      json: true,
      model: 'deepseek-chat',
    });

    expect(capturedUrl).toBe('https://api.deepseek.com/chat/completions');
    expect(capturedOptions.headers.Authorization).toBe('Bearer sk-test-secret-key');

    const body = JSON.parse(capturedOptions.body);
    expect(body.model).toBe('deepseek-chat');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: 'You are an assistant. Respond with valid JSON only.',
    });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' });

    expect(res.text).toBe('{"status": "ok"}');
    expect(res.usage.inputTokens).toBe(12);
    expect(res.usage.outputTokens).toBe(6);
  });

  it('retries on 429 status and succeeds on subsequent attempt', async () => {
    let attempt = 0;
    const sleepImpl = vi.fn(async () => {});

    const mockFetch = vi.fn(async () => {
      attempt++;
      if (attempt === 1) {
        return new Response('Rate limit exceeded', { status: 429 });
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: '{"success": true}' },
              finish_reason: 'stop',
            },
          ],
          model: 'deepseek-chat',
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const provider = createDeepSeekProvider({
      apiKey: 'sk-test-key',
      baseUrl: 'https://api.deepseek.com',
      fetchImpl: mockFetch as any,
      sleepImpl,
    });

    const res = await provider.chat({
      system: 'System prompt',
      messages: [{ role: 'user', content: 'Test' }],
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalled();
    expect(res.text).toBe('{"success": true}');
  });

  it('does NOT retry on 401 status', async () => {
    const sleepImpl = vi.fn(async () => {});
    const mockFetch = vi.fn(async () => {
      return new Response('Unauthorized', { status: 401 });
    });

    const provider = createDeepSeekProvider({
      apiKey: 'invalid-key',
      baseUrl: 'https://api.deepseek.com',
      fetchImpl: mockFetch as any,
      sleepImpl,
    });

    await expect(
      provider.chat({
        system: 'System prompt',
        messages: [{ role: 'user', content: 'Test' }],
      })
    ).rejects.toThrow(AiProviderError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(sleepImpl).not.toHaveBeenCalled();
  });
});
