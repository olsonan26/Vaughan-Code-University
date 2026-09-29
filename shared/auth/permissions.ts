/**
 * SINGLE SOURCE OF TRUTH for roles and permissions.
 * Used by the server (authoritative enforcement) and the client (UI visibility only).
 * Mirrors the SQL enum `public.app_role` and SQL helper functions in supabase/migrations.
 */

export const APP_ROLES = [
  'student',
  'moderator',
  'instructor',
  'senior_instructor',
  'admin',
  'headmaster',
] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const PERMISSIONS = [
  // Studio access
  'studio.access',
  // Knowledge Vault
  'knowledge.upload',
  'knowledge.read_own',
  'knowledge.read_shared', // organization / canonical shared library
  'knowledge.manage_all',
  'knowledge.set_authority', // set levels 4-5 (canonical / approved)
  'knowledge.lock', // lock canonical concepts / principles
  'classroom.manage', // place material, edit classroom structure
  'kate.use', // chat with Kate
  'content.lock', // lock/unlock anything in the Classroom
  // Courses
  'course.create',
  'course.edit_own', // owned or collaborator
  'course.edit_all',
  'course.review', // review others' drafts
  'course.approve',
  'course.publish',
  'course.publish_override', // publish despite blockers
  'course.archive',
  // AI
  'ai.generate',
  'ai.configure',
  // Admin / ops
  'admin.users',
  'admin.roles',
  'admin.jobs',
  'admin.audit_log',
  // Community
  'community.moderate',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const INSTRUCTOR: Permission[] = [
  'studio.access',
  'knowledge.upload',
  'knowledge.read_own',
  'course.create',
  'course.edit_own',
  'ai.generate',
  'classroom.manage',
  'kate.use',
  'content.lock',
];

const SENIOR_INSTRUCTOR: Permission[] = [
  ...INSTRUCTOR,
  'knowledge.read_shared',
  'course.review',
  'course.approve',
];

const ADMIN: Permission[] = [
  ...SENIOR_INSTRUCTOR,
  'knowledge.manage_all',
  'knowledge.set_authority',
  'course.edit_all',
  'course.publish',
  'course.archive',
  'admin.users',
  'admin.roles',
  'admin.jobs',
  'admin.audit_log',
  'community.moderate',
  'ai.configure',
];

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  student: [],
  moderator: ['community.moderate'],
  instructor: INSTRUCTOR,
  senior_instructor: SENIOR_INSTRUCTOR,
  admin: ADMIN,
  headmaster: [...ADMIN, 'knowledge.lock', 'course.publish_override'],
};

export function permissionsFor(roles: readonly AppRole[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) for (const p of ROLE_PERMISSIONS[role] ?? []) set.add(p);
  return set;
}

export function hasPermission(roles: readonly AppRole[], permission: Permission): boolean {
  return roles.some((r) => (ROLE_PERMISSIONS[r] ?? []).includes(permission));
}

/** Display ordering / label helpers (UI only). */
export const ROLE_LABELS: Record<AppRole, string> = {
  student: 'Student',
  moderator: 'Moderator',
  instructor: 'Instructor',
  senior_instructor: 'Senior Instructor',
  admin: 'Admin',
  headmaster: 'Headmaster',
};

export function highestRole(roles: readonly AppRole[]): AppRole {
  let best: AppRole = 'student';
  for (const r of roles) if (APP_ROLES.indexOf(r) > APP_ROLES.indexOf(best)) best = r;
  return best;
}

/** Default organization (single-tenant today, multi-tenant-ready schema). */
export const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_ORGANIZATION_SLUG = 'vaughan-code-university';
