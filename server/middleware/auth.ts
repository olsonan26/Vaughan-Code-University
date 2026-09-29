import type { MiddlewareHandler } from 'hono';
import type { AppEnv, AuthContext } from '../context.js';
import {
  DEFAULT_ORGANIZATION_ID,
  permissionsFor,
  type AppRole,
  type Permission,
} from '../../shared/auth/permissions.js';
import { getServiceClient } from '../lib/supabase.js';
import { HttpError } from '../lib/errors.js';

export interface AuthResolver {
  resolveAuth(accessToken: string, targetOrgId?: string): Promise<AuthContext>;
}

export class SupabaseAuthResolver implements AuthResolver {
  async resolveAuth(accessToken: string, targetOrgId?: string): Promise<AuthContext> {
    const supabase = getServiceClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      throw new HttpError(401, 'unauthorized', 'Missing or invalid authentication token');
    }

    let orgId = DEFAULT_ORGANIZATION_ID;
    if (targetOrgId && targetOrgId !== DEFAULT_ORGANIZATION_ID) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('organization_id', targetOrgId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        orgId = targetOrgId;
      }
    }

    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId);

    const roles: AppRole[] = ((roleRows as Array<{ role: string }> | null) || []).map(
      (r) => r.role as AppRole
    );

    await maybeBootstrapHeadmaster(supabase, user, orgId, roles);

    const permissions = permissionsFor(roles);

    return {
      userId: user.id,
      email: user.email ?? null,
      organizationId: orgId,
      roles,
      permissions,
      accessToken,
      can: (permission: Permission) => permissions.has(permission),
    };
  }
}

let activeAuthResolver: AuthResolver = new SupabaseAuthResolver();

export function setAuthResolver(resolver: AuthResolver | null): void {
  activeAuthResolver = resolver || new SupabaseAuthResolver();
}

export function getAuthResolver(): AuthResolver {
  return activeAuthResolver;
}

export function requireAuth(customResolver?: AuthResolver): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'unauthorized', 'Missing or invalid authentication token');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new HttpError(401, 'unauthorized', 'Missing or invalid authentication token');
    }

    const targetOrgId = c.req.header('X-Organization-Id');
    const resolver = customResolver || getAuthResolver();

    try {
      const auth = await resolver.resolveAuth(token, targetOrgId);
      c.set('auth', auth);
    } catch (err) {
      if (err instanceof HttpError) {
        throw err;
      }
      throw new HttpError(401, 'unauthorized', 'Invalid or expired authentication token');
    }

    await next();
  };
}

export function requirePermission(...perms: Permission[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const missing = perms.filter((p) => !auth.can(p));
    if (missing.length > 0) {
      throw new HttpError(
        403,
        'forbidden',
        `Missing required permission: ${missing.join(', ')}`,
        { details: { missingPermissions: missing } }
      );
    }

    await next();
  };
}

export function optionalAuth(customResolver?: AuthResolver): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const targetOrgId = c.req.header('X-Organization-Id');
        const resolver = customResolver || getAuthResolver();
        try {
          const auth = await resolver.resolveAuth(token, targetOrgId);
          c.set('auth', auth);
        } catch {
          // ignore auth failure for optionalAuth
        }
      }
    }

    await next();
  };
}


/**
 * One-time owner bootstrap: if BOOTSTRAP_HEADMASTER_EMAIL is set, the organization has NO headmaster yet,
 * and a user signs in with that exact, confirmed email, grant them headmaster. After the first headmaster
 * exists this never fires again; further roles are assigned in-app (admin.users). Logged to activity_log.
 */
async function maybeBootstrapHeadmaster(supabase: any, user: any, orgId: string, roles: AppRole[]) {
  const target = (process.env.BOOTSTRAP_HEADMASTER_EMAIL || '').trim().toLowerCase();
  if (!target || roles.includes('headmaster' as AppRole)) return;
  if ((user.email || '').toLowerCase() !== target || !user.email_confirmed_at) return;
  const { count } = await supabase
    .from('user_roles')
    .select('user_id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('role', 'headmaster');
  if ((count ?? 0) > 0) return;
  const { error } = await supabase.from('user_roles').insert({ user_id: user.id, organization_id: orgId, role: 'headmaster' });
  if (error) {
    console.error('[auth] headmaster bootstrap failed:', error.message);
    return;
  }
  roles.push('headmaster' as AppRole);
  await supabase.from('activity_log').insert({
    organization_id: orgId, actor_id: user.id, action: 'role.bootstrap_headmaster', entity_type: 'user', entity_id: user.id,
    metadata: { reason: 'BOOTSTRAP_HEADMASTER_EMAIL matched first confirmed sign-in' },
  }).then(() => undefined, () => undefined);
}
