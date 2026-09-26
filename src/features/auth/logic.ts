import type { AppRole, Permission } from '../../../shared/auth/permissions';
import { hasPermission } from '../../../shared/auth/permissions';
import type { User, UserRole } from '../../types';
import type { AuthMode, PermissionHelpers } from './types';

export function mapSupabaseError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const msg = typeof error === 'string' ? error : error.message || error.error_description || '';
  const lower = msg.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('wrong password') ||
    lower.includes('invalid grant')
  ) {
    return 'Incorrect email or password.';
  }

  if (
    lower.includes('email not confirmed') ||
    lower.includes('confirm your email') ||
    lower.includes('email link is invalid')
  ) {
    return 'Please confirm your email address first - check your inbox.';
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('too many attempts') ||
    error?.status === 429
  ) {
    return 'Too many attempts. Wait a minute and try again.';
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('user already exists') ||
    lower.includes('email already in use')
  ) {
    return 'An account with this email already exists.';
  }

  if (
    lower.includes('password should be at least') ||
    lower.includes('password must be at least')
  ) {
    return 'Password must be at least 6 characters.';
  }

  return msg || 'An unexpected authentication error occurred.';
}

export function deriveLegacyRole(roles: AppRole[]): UserRole {
  if (hasPermission(roles, 'studio.access')) {
    return 'creator';
  }
  if (hasPermission(roles, 'community.moderate')) {
    return 'moderator';
  }
  return 'member';
}

export function resolvePermissionHelpers(
  mode: AuthMode,
  roles: AppRole[],
  legacyUser: User | null | undefined,
  env: { DEV: boolean; VITE_ENABLE_DEV_PERSONAS?: string }
): PermissionHelpers {
  if (mode === 'supabase') {
    return {
      canAccessInstructorStudio: hasPermission(roles, 'studio.access'),
      canAccessAdmin: hasPermission(roles, 'admin.users'),
      canModerateCommunity: hasPermission(roles, 'community.moderate'),
      can: (permission: Permission) => hasPermission(roles, permission),
    };
  }

  // Demo mode
  const devPersonasEnabled = Boolean(env.DEV) && env.VITE_ENABLE_DEV_PERSONAS === 'true';
  const canAccessInstructorStudio = legacyUser?.role === 'creator' && devPersonasEnabled;
  const canAccessAdmin = legacyUser?.role === 'creator';
  const canModerateCommunity = legacyUser?.role === 'creator' || legacyUser?.role === 'moderator';

  return {
    canAccessInstructorStudio,
    canAccessAdmin,
    canModerateCommunity,
    can: (permission: Permission) => {
      if (permission === 'studio.access') return canAccessInstructorStudio;
      if (permission === 'admin.users') return canAccessAdmin;
      if (permission === 'community.moderate') return canModerateCommunity;
      if (legacyUser?.role === 'creator') {
        return hasPermission(['admin'], permission);
      }
      return false;
    },
  };
}
