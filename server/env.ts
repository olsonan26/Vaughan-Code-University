/**
 * Server-only configuration. NEVER import this from src/ (browser code).
 * Missing values do not crash module load; callers get a clear 'not_configured' error instead.
 */
const isOpenRouter = (process.env.DEEPSEEK_API_KEY || '').startsWith('sk-or-') || /openrouter\.ai/.test(process.env.DEEPSEEK_BASE_URL || '');

export const serverEnv = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  aiProvider: process.env.AI_PROVIDER || 'deepseek',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  /** DeepSeek is reached directly (sk-...) or through OpenRouter (sk-or-...); detected from the key. */
  aiViaOpenRouter: isOpenRouter,
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || (isOpenRouter ? 'https://openrouter.ai/api/v1' : 'https://api.deepseek.com'),
  deepseekModel: process.env.DEEPSEEK_MODEL || (isOpenRouter ? 'deepseek/deepseek-v4.1-flash' : 'deepseek-chat'),
  deepseekReasoningModel: process.env.DEEPSEEK_REASONING_MODEL || (isOpenRouter ? 'deepseek/deepseek-v4-pro' : 'deepseek-reasoner'),
  embeddingProvider: process.env.EMBEDDING_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : isOpenRouter ? 'openrouter' : 'none'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  embeddingModel: process.env.EMBEDDING_MODEL || (isOpenRouter && !process.env.OPENAI_API_KEY ? 'openai/text-embedding-3-small' : 'text-embedding-3-small'),
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS || 1536),
  appUrl: process.env.APP_URL || '',
  cronSecret: process.env.CRON_SECRET || '',
  workerSecret: process.env.WORKER_SECRET || process.env.CRON_SECRET || '',
  /** Dev-only persona login. Server refuses when NODE_ENV === 'production' or VERCEL_ENV === 'production'. */
  enableDevPersonas:
    process.env.ENABLE_DEV_PERSONAS === 'true' &&
    process.env.NODE_ENV !== 'production' &&
    process.env.VERCEL_ENV !== 'production',
};

export const isSupabaseServerConfigured = () =>
  Boolean(serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey);
export const isAiConfigured = () => Boolean(serverEnv.deepseekApiKey);
