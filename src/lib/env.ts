/**
 * Browser-safe configuration. Only VITE_-prefixed values are available here.
 * Secrets (service role key, DeepSeek key) are intentionally absent: they exist
 * only in server-side code under /api.
 */
export const clientEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
};

/** True once Supabase is configured for this environment. Until then the app runs on local demo data. */
export const isSupabaseConfigured = Boolean(clientEnv.supabaseUrl && clientEnv.supabaseAnonKey);
