import type { Session } from '@supabase/supabase-js';
import type { AppRole, Permission } from '../../../shared/auth/permissions';

/** Profile row as returned by GET /api/me (see supabase profiles table). */
export interface AuthProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  xp: number;
  level: number;
  subscriptionTier: 'free' | 'pro' | 'vip';
}

export type AuthMode = 'supabase' | 'demo';
export type AuthStatus = 'loading' | 'signed_out' | 'signed_in';

export interface AuthResult {
  ok: boolean;
  /** Specific, user-facing error (wrong password, email not confirmed, rate limited, ...). */
  error?: string;
  /** e.g. sign-up needs email confirmation */
  info?: string;
}

/** The contract every auth consumer uses. Implemented by AuthProvider (src/features/auth/AuthProvider.tsx). */
export interface AuthState {
  mode: AuthMode;
  /** true when running without Supabase (local demo personas). */
  isDemoMode: boolean;
  status: AuthStatus;
  session: Session | null;
  userId: string | null;
  email: string | null;
  profile: AuthProfile | null;
  roles: AppRole[];
  organizationId: string | null;
  /** Non-blocking warning, e.g. roles loaded from fallback. */
  warning: string | null;
  can: (permission: Permission) => boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (displayName: string, email: string, password: string) => Promise<AuthResult>;
  sendMagicLink: (email: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Permission helpers exposed by usePermissions() in src/lib/permissions.ts. */
export interface PermissionHelpers {
  canAccessInstructorStudio: boolean;
  canAccessAdmin: boolean;
  canModerateCommunity: boolean;
  can: (permission: Permission) => boolean;
}
