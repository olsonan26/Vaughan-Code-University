import { describe, it, expect } from 'vitest';
import { mapSupabaseError, deriveLegacyRole, resolvePermissionHelpers } from './logic';
import type { User } from '../../types';

describe('mapSupabaseError', () => {
  it('maps invalid credentials error', () => {
    expect(mapSupabaseError({ message: 'Invalid login credentials' })).toBe('Incorrect email or password.');
    expect(mapSupabaseError('Invalid email or password')).toBe('Incorrect email or password.');
  });

  it('maps unconfirmed email error', () => {
    expect(mapSupabaseError({ message: 'Email not confirmed' })).toBe('Please confirm your email address first - check your inbox.');
  });

  it('maps rate limit error', () => {
    expect(mapSupabaseError({ message: 'Too many requests', status: 429 })).toBe('Too many attempts. Wait a minute and try again.');
  });

  it('maps existing user error', () => {
    expect(mapSupabaseError({ message: 'User already registered' })).toBe('An account with this email already exists.');
  });

  it('maps short password error', () => {
    expect(mapSupabaseError({ message: 'Password should be at least 6 characters' })).toBe('Password must be at least 6 characters.');
  });

  it('falls back to error message or default', () => {
    expect(mapSupabaseError({ message: 'Custom server error' })).toBe('Custom server error');
    expect(mapSupabaseError(null)).toBe('An unexpected authentication error occurred.');
  });
});

describe('deriveLegacyRole', () => {
  it('returns creator when studio.access permission is present', () => {
    expect(deriveLegacyRole(['instructor'])).toBe('creator');
    expect(deriveLegacyRole(['admin'])).toBe('creator');
    expect(deriveLegacyRole(['headmaster'])).toBe('creator');
  });

  it('returns moderator when community.moderate is present without studio.access', () => {
    expect(deriveLegacyRole(['moderator'])).toBe('moderator');
  });

  it('returns member for students or empty roles', () => {
    expect(deriveLegacyRole(['student'])).toBe('member');
    expect(deriveLegacyRole([])).toBe('member');
  });
});

describe('resolvePermissionHelpers', () => {
  const creatorUser: User = {
    id: 'user-creator',
    name: 'Prof. Vaughan',
    email: 'vaughan@vcu.edu',
    avatar: '',
    role: 'creator',
    subscriptionTier: 'vip',
    level: 10,
    xp: 1000,
    streakDays: 5,
    lastActiveDate: '2026-09-26',
    bio: '',
    joinedDate: '2026-01-01',
    badges: [],
    completedLessonIds: [],
    passedTestIds: [],
    activityHistory: [],
  };

  const studentUser: User = {
    ...creatorUser,
    id: 'user-student',
    role: 'member',
  };

  it('in supabase mode uses role-based permissions', () => {
    const helpers = resolvePermissionHelpers('supabase', ['instructor'], null, { DEV: false });
    expect(helpers.canAccessInstructorStudio).toBe(true);
    expect(helpers.canAccessAdmin).toBe(false);
    expect(helpers.canModerateCommunity).toBe(false);
    expect(helpers.can('studio.access')).toBe(true);
  });

  it('in demo mode allows instructor studio ONLY when DEV and VITE_ENABLE_DEV_PERSONAS is true', () => {
    // DEV true and flag true -> allowed for creator
    const allowed = resolvePermissionHelpers('demo', [], creatorUser, { DEV: true, VITE_ENABLE_DEV_PERSONAS: 'true' });
    expect(allowed.canAccessInstructorStudio).toBe(true);

    // DEV false -> restricted even for creator
    const prodMode = resolvePermissionHelpers('demo', [], creatorUser, { DEV: false, VITE_ENABLE_DEV_PERSONAS: 'true' });
    expect(prodMode.canAccessInstructorStudio).toBe(false);

    // flag missing/false -> restricted
    const flagDisabled = resolvePermissionHelpers('demo', [], creatorUser, { DEV: true, VITE_ENABLE_DEV_PERSONAS: 'false' });
    expect(flagDisabled.canAccessInstructorStudio).toBe(false);

    // student user in demo mode -> restricted
    const student = resolvePermissionHelpers('demo', [], studentUser, { DEV: true, VITE_ENABLE_DEV_PERSONAS: 'true' });
    expect(student.canAccessInstructorStudio).toBe(false);
  });

  it('in demo mode allows admin and moderation for legacy creator/moderator roles', () => {
    const creatorHelpers = resolvePermissionHelpers('demo', [], creatorUser, { DEV: false });
    expect(creatorHelpers.canAccessAdmin).toBe(true);
    expect(creatorHelpers.canModerateCommunity).toBe(true);

    const studentHelpers = resolvePermissionHelpers('demo', [], studentUser, { DEV: false });
    expect(studentHelpers.canAccessAdmin).toBe(false);
    expect(studentHelpers.canModerateCommunity).toBe(false);
  });
});
