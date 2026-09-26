import type { AiTier } from './tiers.js';

export interface AiRequestLogEntry {
  organization_id: string;
  user_id: string;
  job_id?: string;
  job_step_id?: string;
  skill: string;
  prompt_version: string;
  provider: string;
  model: string;
  tier: AiTier;
  status: 'success' | 'error';
  error?: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  latency_ms: number;
  estimated_cost_usd: number;
  course_id?: string;
  lesson_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AiRequestLogger {
  log(e: AiRequestLogEntry): Promise<void>;
}

export const noopLogger: AiRequestLogger = {
  async log(): Promise<void> {},
};

export function createSupabaseAiLogger(client: { from(t: string): any }): AiRequestLogger {
  return {
    async log(entry: AiRequestLogEntry): Promise<void> {
      try {
        const { error } = await client.from('ai_requests').insert(entry);
        if (error) {
          console.error('Failed to log AI request to Supabase:', error);
        }
      } catch (err) {
        console.error('Failed to log AI request to Supabase:', err);
      }
    },
  };
}
