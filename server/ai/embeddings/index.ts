/**
 * Embedding providers. DeepSeek has no embeddings API, so semantic search uses OpenAI
 * embeddings when OPENAI_API_KEY is set; otherwise callers fall back to Postgres full-text search.
 */
import { serverEnv } from '../../env.js';

export interface EmbeddingProvider {
  name: 'openai' | 'none';
  dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export const noneEmbeddingProvider: EmbeddingProvider = {
  name: 'none',
  dimensions: 0,
  async embed() {
    throw new Error('No embedding provider is configured (set OPENAI_API_KEY); full-text search is used instead.');
  },
};

export function createOpenAiEmbeddingProvider(opts: { apiKey: string; model?: string; dimensions?: number; fetchImpl?: typeof fetch }): EmbeddingProvider {
  const f = opts.fetchImpl ?? fetch;
  const model = opts.model ?? 'text-embedding-3-small';
  const dimensions = opts.dimensions ?? 1536;
  return {
    name: 'openai',
    dimensions,
    async embed(texts) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += 96) {
        const batch = texts.slice(i, i + 96).map((t) => t.slice(0, 24000));
        let lastErr: unknown;
        for (let attempt = 0; attempt < 4; attempt++) {
          const res = await f('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, input: batch, dimensions }),
          });
          if (res.ok) {
            const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
            json.data.sort((a, b) => a.index - b.index).forEach((d) => out.push(d.embedding));
            lastErr = null;
            break;
          }
          lastErr = new Error(`Embedding request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
          if (res.status !== 429 && res.status < 500) break;
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
        if (lastErr) throw lastErr;
      }
      return out;
    },
  };
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (serverEnv.embeddingProvider === 'openai' && serverEnv.openaiApiKey) {
    return createOpenAiEmbeddingProvider({ apiKey: serverEnv.openaiApiKey, model: serverEnv.embeddingModel, dimensions: serverEnv.embeddingDimensions });
  }
  return noneEmbeddingProvider;
}
