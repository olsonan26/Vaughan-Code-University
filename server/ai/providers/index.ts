import { serverEnv } from '../../env.js';
import { createDeepSeekProvider } from './deepseek.js';
import { createMockProvider } from './mock.js';
import type { ChatProvider } from './types.js';

export interface ProviderSettings {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function getChatProvider(settings?: ProviderSettings): ChatProvider {
  const providerName = (settings?.provider || serverEnv.aiProvider || 'deepseek').toLowerCase();

  if (providerName === 'mock') {
    return createMockProvider();
  }

  return createDeepSeekProvider({
    apiKey: settings?.apiKey,
    baseUrl: settings?.baseUrl,
    defaultModel: settings?.model,
  });
}

export * from './types.js';
export * from './deepseek.js';
export * from './mock.js';
