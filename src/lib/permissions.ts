import { useApp } from '../context/AppContext';
import { useAuth } from '../features/auth/AuthProvider';
import { resolvePermissionHelpers } from '../features/auth/logic';
import type { PermissionHelpers } from '../features/auth/types';
import type { User } from '../types';

/**
 * Single place for UI access checks.
 *
 * IMPORTANT: these are presentation checks only (which buttons/screens to show).
 * They are NOT a security boundary. Once Supabase Auth lands, real authorization is
 * enforced by database-backed roles, Row Level Security and server-side checks, and
 * these helpers will read the role from the authenticated profile instead of local data.
 *
 * Authorization must never depend on a person's display name or a hardcoded user id.
 */

/** Faculty (Headmaster / Instructor) may enter the Instructor Studio. Moderators may not. */
export function canAccessInstructorStudio(user: User | null | undefined): boolean {
  return user?.role === 'creator';
}

/** Faculty administration (users, tiers, broadcasts). */
export function canAccessAdmin(user: User | null | undefined): boolean {
  return user?.role === 'creator';
}

/** Community moderation (pin/remove posts). */
export function canModerateCommunity(user: User | null | undefined): boolean {
  return user?.role === 'creator' || user?.role === 'moderator';
}

/**
 * Preferred API. Supabase mode: server-provided roles + shared permission matrix.
 * Demo mode: legacy local roles; Instructor Studio only in dev with VITE_ENABLE_DEV_PERSONAS=true.
 */
export function usePermissions(): PermissionHelpers {
  const auth = useAuth();
  const { currentUser } = useApp();
  return resolvePermissionHelpers(auth.mode, auth.roles, currentUser, {
    DEV: import.meta.env.DEV,
    VITE_ENABLE_DEV_PERSONAS: import.meta.env.VITE_ENABLE_DEV_PERSONAS,
  });
}
