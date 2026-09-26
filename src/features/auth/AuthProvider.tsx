import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppRole, Permission } from '../../../shared/auth/permissions';
import { hasPermission } from '../../../shared/auth/permissions';
import { isSupabaseConfigured } from '../../lib/env';
import { getSupabase } from '../../services/supabase/client';
import { fetchMe, fetchRolesDirect } from './meClient';
import { mapSupabaseError } from './logic';
import type { AuthProfile, AuthResult, AuthState, AuthStatus } from './types';

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isConfigured = isSupabaseConfigured;
  const mode = isConfigured ? 'supabase' : 'demo';
  const isDemoMode = !isConfigured;

  const [status, setStatus] = useState<AuthStatus>(isConfigured ? 'loading' : 'signed_out');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const loadUserData = async (currentSession: Session | null) => {
    if (!currentSession) {
      setSession(null);
      setProfile(null);
      setRoles([]);
      setOrganizationId(null);
      setWarning(null);
      setStatus('signed_out');
      return;
    }

    setSession(currentSession);
    const userId = currentSession.user.id;
    const token = currentSession.access_token;

    try {
      const meResult = await fetchMe(token);
      setProfile(meResult.profile);
      setRoles(meResult.roles);
      setOrganizationId(meResult.organizationId);
      setWarning(null);
    } catch {
      // Fallback direct
      const supabase = getSupabase();
      if (supabase) {
        try {
          const direct = await fetchRolesDirect(supabase, userId);
          const fallbackProfile: AuthProfile = direct.profile || {
            id: userId,
            email: currentSession.user.email ?? null,
            displayName: (currentSession.user.user_metadata?.display_name as string) ?? null,
            avatarUrl: null,
            bio: null,
            xp: 0,
            level: 1,
            subscriptionTier: 'free',
          };
          setProfile(fallbackProfile);
          setRoles(direct.roles);
          setOrganizationId(direct.organizationId);
          setWarning('Roles loaded directly; server API unreachable');
        } catch {
          setWarning('Failed to load user profile or roles');
        }
      }
    } finally {
      setStatus('signed_in');
    }
  };

  useEffect(() => {
    if (!isConfigured) return;
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      loadUserData(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      loadUserData(s);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signInWithPassword = async (email: string, password: string): Promise<AuthResult> => {
    if (!isConfigured) {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    }
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase client unavailable' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }
    return { ok: true };
  };

  const signUp = async (displayName: string, email: string, password: string): Promise<AuthResult> => {
    if (!isConfigured) {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    }
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase client unavailable' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/community`,
      },
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }

    if (!data.session) {
      return { ok: true, info: 'Please confirm your email address first - check your inbox.' };
    }

    return { ok: true };
  };

  const sendMagicLink = async (email: string): Promise<AuthResult> => {
    if (!isConfigured) {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    }
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase client unavailable' };

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/community` },
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }
    return { ok: true, info: 'Magic link sent to your email.' };
  };

  const sendPasswordReset = async (email: string): Promise<AuthResult> => {
    if (!isConfigured) {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    }
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase client unavailable' };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }
    return { ok: true, info: 'Password reset link sent to your email.' };
  };

  const updatePassword = async (newPassword: string): Promise<AuthResult> => {
    if (!isConfigured) {
      return { ok: false, error: 'Demo mode: no backend configured.' };
    }
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'Supabase client unavailable' };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { ok: false, error: mapSupabaseError(error) };
    }
    return { ok: true };
  };

  const signOut = async (): Promise<void> => {
    if (!isConfigured) return;
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const refresh = async (): Promise<void> => {
    if (!isConfigured) return;
    const supabase = getSupabase();
    if (supabase) {
      const { data: { session: s } } = await supabase.auth.getSession();
      await loadUserData(s);
    }
  };

  const can = (permission: Permission): boolean => {
    if (!isConfigured) return false;
    return hasPermission(roles, permission);
  };

  const value: AuthState = {
    mode,
    isDemoMode,
    status,
    session,
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
    profile,
    roles,
    organizationId,
    warning,
    can,
    signInWithPassword,
    signUp,
    sendMagicLink,
    sendPasswordReset,
    updatePassword,
    signOut,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
