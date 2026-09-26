import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRole, Permission } from '../../../shared/auth/permissions';
import type { AuthProfile } from './types';

export interface FetchMeResult {
  profile: AuthProfile;
  roles: AppRole[];
  organizationId: string | null;
  permissions?: Permission[];
}

export function mapProfile(raw: any): AuthProfile {
  return {
    id: raw.id,
    email: raw.email ?? null,
    displayName: raw.display_name ?? raw.displayName ?? null,
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? null,
    bio: raw.bio ?? null,
    xp: typeof raw.xp === 'number' ? raw.xp : 0,
    level: typeof raw.level === 'number' ? raw.level : 1,
    subscriptionTier: (['free', 'pro', 'vip'].includes(raw.subscription_tier ?? raw.subscriptionTier)
      ? (raw.subscription_tier ?? raw.subscriptionTier)
      : 'free') as 'free' | 'pro' | 'vip',
  };
}

export async function fetchMe(token: string): Promise<FetchMeResult> {
  const res = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`fetchMe failed with status ${res.status}`);
  }

  const data = await res.json();
  if (!data.profile) {
    throw new Error('Invalid /api/me response: missing profile');
  }

  return {
    profile: mapProfile(data.profile),
    roles: Array.isArray(data.roles) ? data.roles : [],
    organizationId: data.organizationId ?? data.organization_id ?? null,
    permissions: Array.isArray(data.permissions) ? data.permissions : undefined,
  };
}

export async function fetchRolesDirect(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: AuthProfile | null; roles: AppRole[]; organizationId: string | null }> {
  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('role, organization_id')
    .eq('user_id', userId);

  const roles: AppRole[] = Array.isArray(rolesData) && rolesData.length > 0
    ? (rolesData.map((r: any) => r.role).filter(Boolean) as AppRole[])
    : ['student'];

  const organizationId = Array.isArray(rolesData) && rolesData[0]?.organization_id
    ? rolesData[0].organization_id
    : null;

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const profile = profileData ? mapProfile(profileData) : null;

  return { profile, roles, organizationId };
}
