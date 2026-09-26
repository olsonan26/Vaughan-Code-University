import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv, isSupabaseServerConfigured } from '../env.js';
import { HttpError } from './errors.js';

let customServiceClient: SupabaseClient | null = null;
let serviceClientInstance: SupabaseClient | null = null;

/** Allows tests or DI to substitute the service client instance. */
export function setCustomServiceClient(client: SupabaseClient | null): void {
  customServiceClient = client;
}

export function getServiceClient(): SupabaseClient {
  if (customServiceClient) {
    return customServiceClient;
  }

  if (!isSupabaseServerConfigured()) {
    throw new HttpError(
      503,
      'not_configured',
      'Supabase is not configured on the server: set SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  if (!serviceClientInstance) {
    serviceClientInstance = createClient(
      serverEnv.supabaseUrl,
      serverEnv.supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return serviceClientInstance;
}

export function createUserClient(accessToken: string): SupabaseClient {
  const url = serverEnv.supabaseUrl;
  const key = serverEnv.supabaseAnonKey || serverEnv.supabaseServiceRoleKey;

  if (!url || !key) {
    throw new HttpError(
      503,
      'not_configured',
      'Supabase is not configured on the server: set SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
