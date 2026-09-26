import type { Context } from 'hono';
import type { AppEnv, AuthContext } from '../context.js';
import { DEFAULT_ORGANIZATION_ID } from '../../shared/auth/permissions.js';
import { getServiceClient } from './supabase.js';

export interface LogActivityParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  organizationId?: string;
  actorId?: string;
}

export async function logActivity(
  cOrAuth: Context<AppEnv> | AuthContext | null | undefined,
  params: LogActivityParams
): Promise<void> {
  try {
    let orgId = params.organizationId || DEFAULT_ORGANIZATION_ID;
    let actorId = params.actorId || null;

    if (cOrAuth) {
      if ('var' in cOrAuth && cOrAuth.var?.auth) {
        orgId = params.organizationId || cOrAuth.var.auth.organizationId || DEFAULT_ORGANIZATION_ID;
        actorId = params.actorId || cOrAuth.var.auth.userId || null;
      } else if ('userId' in cOrAuth && 'organizationId' in cOrAuth) {
        orgId = params.organizationId || (cOrAuth as AuthContext).organizationId || DEFAULT_ORGANIZATION_ID;
        actorId = params.actorId || (cOrAuth as AuthContext).userId || null;
      }
    }

    const supabase = getServiceClient();
    const { error } = await supabase.from('activity_log').insert({
      organization_id: orgId,
      actor_id: actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      metadata: params.metadata || null,
    });

    if (error) {
      console.error('[logActivity] Failed to insert activity_log:', error.message);
    }
  } catch (err) {
    console.error('[logActivity] Non-fatal exception logging activity:', err);
  }
}
