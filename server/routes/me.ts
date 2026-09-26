import { Hono } from 'hono';
import type { AppEnv } from '../context.js';
import { requireAuth } from '../middleware/auth.js';
import { getServiceClient } from '../lib/supabase.js';

export const meRoutes = new Hono<AppEnv>();

meRoutes.get('/', requireAuth(), async (c) => {
  const auth = c.get('auth');
  let profile = null;

  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.userId)
      .maybeSingle();
    profile = data;
  } catch (err) {
    console.warn('[meRoutes] Unable to fetch profile from database:', err);
  }

  const defaultProfile = {
    id: auth.userId,
    email: auth.email,
    display_name: null,
    avatar_url: null,
    subscription_tier: 'free',
  };

  return c.json({
    user: {
      id: auth.userId,
      email: auth.email,
    },
    profile: profile || defaultProfile,
    organizationId: auth.organizationId,
    roles: auth.roles,
    permissions: Array.from(auth.permissions),
  });
});
