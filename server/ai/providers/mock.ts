import type { ChatProvider, ChatRequest, ChatResponse } from './types.js';

export type MockResponder = (req: ChatRequest) => Promise<ChatResponse> | ChatResponse;

export class MockProvider implements ChatProvider {
  readonly name = 'mock';
  private responder?: MockResponder;

  constructor(responder?: MockResponder) {
    this.responder = responder;
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    if (this.responder) {
      return this.responder(req);
    }
    return {
      text: req.json ? '{"mock": true}' : 'Mock response',
      model: req.model || 'mock-model',
      usage: {
        inputTokens: 10,
        outputTokens: 10,
        cachedTokens: 0,
      },
      latencyMs: 5,
      finishReason: 'stop',
    };
  }
}

export function createMockProvider(responder?: MockResponder): MockProvider {
  return new MockProvider(responder);
}
