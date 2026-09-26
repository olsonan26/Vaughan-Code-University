/**
 * Server-only configuration. NEVER import this from src/ (browser code).
 * Missing values do not crash module load; callers get a clear 'not_configured' error instead.
 */
export const serverEnv = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  aiProvider: process.env.AI_PROVIDER || 'deepseek',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  deepseekReasoningModel: process.env.DEEPSEEK_REASONING_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-reasoner',
  embeddingProvider: process.env.EMBEDDING_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'none'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
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
