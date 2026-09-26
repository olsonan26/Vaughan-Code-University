// coordinator replaces with real useAuth/usePermissions
import { useApp } from '../../context/AppContext';
import type { AuthState, PermissionHelpers, AuthResult, AuthProfile, AuthMode } from './types';
import type { AppRole, Permission } from '../../../shared/auth/permissions';
import { canAccessInstructorStudio, canAccessAdmin, canModerateCommunity } from '../../lib/permissions';
import { permissionsFor, hasPermission } from '../../../shared/auth/permissions';

/**
 * SHIM IMPLEMENTATION
 * coordinator replaces with real useAuth/usePermissions
 */
export function useAuth(): AuthState {
  const { currentUser, login, logout } = useApp();

  const mockMode: AuthMode =
    typeof window !== 'undefined' && (window as any).__MOCK_AUTH_MODE__ === 'supabase'
      ? 'supabase'
      : 'demo';

  const isDemoMode = mockMode === 'demo';

  const getRoles = (): AppRole[] => {
    if (!currentUser) return [];
    if (currentUser.id === 'user-creator') return ['headmaster', 'admin', 'instructor', 'senior_instructor', 'student'];
    if (currentUser.id === 'user-instructor') return ['instructor', 'student'];
    if (currentUser.role === 'moderator') return ['moderator', 'student'];
    return ['student'];
  };

  const roles = getRoles();

  const profile: AuthProfile | null = currentUser
    ? {
        id: currentUser.id,
        email: currentUser.email || null,
        displayName: currentUser.name || null,
        avatarUrl: currentUser.avatar || null,
        bio: currentUser.bio || null,
        xp: currentUser.xp || 0,
        level: currentUser.level || 1,
        subscriptionTier: currentUser.subscriptionTier || 'free',
      }
    : null;

  return {
    mode: mockMode,
    isDemoMode,
    status: currentUser ? 'signed_in' : 'signed_out',
    session: null,
    userId: currentUser?.id ?? null,
    email: currentUser?.email ?? null,
    profile,
    roles,
    organizationId: null,
    warning: null,
    can: (permission: Permission) => hasPermission(roles, permission),
    signInWithPassword: async (email: string, password: string): Promise<AuthResult> => {
      const ok = login(email, password);
      if (ok) return { ok: true };
      return { ok: false, error: 'Invalid email or password.' };
    },
    signUp: async (_displayName: string, _email: string, _password: string): Promise<AuthResult> => {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    },
    sendMagicLink: async (_email: string): Promise<AuthResult> => {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    },
    sendPasswordReset: async (_email: string): Promise<AuthResult> => {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    },
    updatePassword: async (_newPassword: string): Promise<AuthResult> => {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    },
    signOut: async () => {
      logout();
    },
    refresh: async () => {},
  };
}

export function usePermissionsShim(): PermissionHelpers {
  const { currentUser } = useApp();
  const auth = useAuth();

  return {
    canAccessInstructorStudio: canAccessInstructorStudio(currentUser),
    canAccessAdmin: canAccessAdmin(currentUser),
    canModerateCommunity: canModerateCommunity(currentUser),
    can: (permission: Permission) => auth.can(permission),
  };
}
