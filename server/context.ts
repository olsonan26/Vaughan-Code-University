import type { AppRole, Permission } from '../shared/auth/permissions.js';

/** Authenticated request identity, resolved server-side from the Supabase JWT + database roles. */
export interface AuthContext {
  userId: string;
  email: string | null;
  organizationId: string;
  roles: AppRole[];
  permissions: Set<Permission>;
  accessToken: string;
  can: (permission: Permission) => boolean;
}

/** Hono environment shared by every route module. */
export interface AppEnv {
  Variables: {
    auth: AuthContext; // present after requireAuth() middleware
    requestId: string;
  };
}
