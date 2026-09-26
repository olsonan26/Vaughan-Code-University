import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../context.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getServiceClient } from '../lib/supabase.js';
import { HttpError } from '../lib/errors.js';
import { parseBody, parseQuery } from '../lib/validate.js';
import { logActivity } from '../lib/activity.js';
import { serverEnv, isAiConfigured } from '../env.js';
import { APP_ROLES, type AppRole } from '../../shared/auth/permissions.js';

export const adminRoutes = new Hono<AppEnv>();

// Apply auth to all admin routes
adminRoutes.use('*', requireAuth());

// 1. GET /api/admin/users
const usersQuerySchema = z.object({
  query: z.string().optional(),
  search: z.string().optional(),
  skip: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20),
});

adminRoutes.get('/users', requirePermission('admin.users'), async (c) => {
  const auth = c.get('auth');
  const { query, search, skip, limit } = parseQuery(c, usersQuerySchema);
  const filter = query || search || '';

  const supabase = getServiceClient();

  let dbQuery = supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  if (filter) {
    dbQuery = dbQuery.or(`email.ilike.%${filter}%,display_name.ilike.%${filter}%`);
  }

  const { data: profiles, count, error } = await dbQuery
    .range(skip, skip + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    throw new HttpError(500, 'database_error', `Failed to fetch users: ${error.message}`);
  }

  const userIds = (profiles || []).map((p: any) => p.id);
  let userRolesMap: Record<string, AppRole[]> = {};

  if (userIds.length > 0) {
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('organization_id', auth.organizationId)
      .in('user_id', userIds);

    if (roleRows) {
      for (const row of roleRows as Array<{ user_id: string; role: string }>) {
        if (!userRolesMap[row.user_id]) {
          userRolesMap[row.user_id] = [];
        }
        userRolesMap[row.user_id].push(row.role as AppRole);
      }
    }
  }

  const items = (profiles || []).map((p: any) => ({
    ...p,
    roles: userRolesMap[p.id] || [],
  }));

  const total = count ?? items.length;
  const nextSkip = skip + items.length;
  const nextCursor = nextSkip < total ? String(nextSkip) : null;

  return c.json({
    items,
    nextCursor,
    total,
  });
});

// 2. POST /api/admin/users/:id/roles
const updateRoleSchema = z.object({
  role: z.enum(APP_ROLES),
  action: z.enum(['grant', 'revoke']),
});

adminRoutes.post('/users/:id/roles', requirePermission('admin.roles'), async (c) => {
  const auth = c.get('auth');
  const targetUserId = c.req.param('id');
  const { role, action } = await parseBody(c, updateRoleSchema);

  // Escalation guard: only headmasters can grant/revoke admin or headmaster
  if (role === 'admin' || role === 'headmaster') {
    if (!auth.roles.includes('headmaster')) {
      throw new HttpError(
        403,
        'forbidden',
        'Only headmasters can grant or revoke admin or headmaster roles'
      );
    }
  }

  const supabase = getServiceClient();

  // Guard: cannot remove the last headmaster
  if (action === 'revoke' && role === 'headmaster') {
    const { count, error } = await supabase
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.organizationId)
      .eq('role', 'headmaster');

    if (error) {
      throw new HttpError(500, 'database_error', `Failed to check headmaster count: ${error.message}`);
    }

    if ((count ?? 0) <= 1) {
      const { data: targetRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('user_id', targetUserId)
        .eq('role', 'headmaster')
        .maybeSingle();

      if (targetRole) {
        throw new HttpError(
          400,
          'cannot_remove_last_headmaster',
          'Cannot remove the last headmaster'
        );
      }
    }
  }

  if (action === 'grant') {
    const { error } = await supabase.from('user_roles').upsert(
      {
        user_id: targetUserId,
        organization_id: auth.organizationId,
        role,
        granted_by: auth.userId,
      },
      { onConflict: 'user_id,organization_id,role' }
    );

    if (error) {
      throw new HttpError(500, 'database_error', `Failed to grant role: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId)
      .eq('organization_id', auth.organizationId)
      .eq('role', role);

    if (error) {
      throw new HttpError(500, 'database_error', `Failed to revoke role: ${error.message}`);
    }
  }

  await logActivity(c, {
    action: action === 'grant' ? 'role.granted' : 'role.revoked',
    entityType: 'user_role',
    entityId: targetUserId,
    metadata: { role, targetUserId },
  });

  const { data: updatedRoleRows } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', targetUserId)
    .eq('organization_id', auth.organizationId);

  const updatedRoles = ((updatedRoleRows as Array<{ role: string }> | null) || []).map(
    (r) => r.role as AppRole
  );

  return c.json({
    success: true,
    userId: targetUserId,
    roles: updatedRoles,
  });
});

// 3. GET /api/admin/activity
const activityQuerySchema = z.object({
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
  skip: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(20),
});

adminRoutes.get('/activity', requirePermission('admin.audit_log'), async (c) => {
  const auth = c.get('auth');
  const { action, entityType, actorId, skip, limit } = parseQuery(c, activityQuerySchema);

  const supabase = getServiceClient();

  let dbQuery = supabase
    .from('activity_log')
    .select('*', { count: 'exact' })
    .eq('organization_id', auth.organizationId);

  if (action) dbQuery = dbQuery.eq('action', action);
  if (entityType) dbQuery = dbQuery.eq('entity_type', entityType);
  if (actorId) dbQuery = dbQuery.eq('actor_id', actorId);

  const { data: items, count, error } = await dbQuery
    .range(skip, skip + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    throw new HttpError(500, 'database_error', `Failed to fetch activity log: ${error.message}`);
  }

  const total = count ?? (items || []).length;
  const nextSkip = skip + (items || []).length;
  const nextCursor = nextSkip < total ? String(nextSkip) : null;

  return c.json({
    items: items || [],
    nextCursor,
    total,
  });
});

// 4. GET /api/admin/settings/ai + PUT /api/admin/settings/ai
const DEFAULT_AI_SETTINGS = {
  provider: serverEnv.aiProvider || 'deepseek',
  model: serverEnv.deepseekModel || 'deepseek-chat',
  reasoningModel: serverEnv.deepseekReasoningModel || 'deepseek-reasoner',
  tierDefaults: {
    light: { provider: 'deepseek', model: 'deepseek-chat' },
    standard: { provider: 'deepseek', model: 'deepseek-chat' },
    high: { provider: 'deepseek', model: 'deepseek-reasoner' },
    max: { provider: 'deepseek', model: 'deepseek-reasoner' },
  },
  rateLimits: {
    maxRequestsPerMinute: 60,
    maxTokensPerMinute: 100000,
  },
  externalResearchEnabled: false,
  promptVersions: {},
};

const aiSettingsSchema = z.object({
  provider: z.string().default('deepseek'),
  model: z.string().default('deepseek-chat'),
  reasoningModel: z.string().default('deepseek-reasoner'),
  tierDefaults: z.record(z.string(), z.unknown()).optional().default({}),
  rateLimits: z.record(z.string(), z.unknown()).optional().default({}),
  externalResearchEnabled: z.boolean().default(false),
  promptVersions: z.record(z.string(), z.string()).optional().default({}),
});

adminRoutes.get('/settings/ai', requirePermission('ai.configure'), async (c) => {
  const auth = c.get('auth');
  const supabase = getServiceClient();

  let storedSettings = null;
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('organization_id', auth.organizationId)
      .eq('key', 'ai')
      .maybeSingle();

    if (data && data.value) {
      storedSettings = data.value;
    }
  } catch (err) {
    console.warn('[adminRoutes] Unable to read ai settings from app_settings:', err);
  }

  const merged = {
    ...DEFAULT_AI_SETTINGS,
    ...(storedSettings || {}),
    apiKeyConfigured: isAiConfigured(),
  };

  return c.json(merged);
});

adminRoutes.put('/settings/ai', requirePermission('ai.configure'), async (c) => {
  const auth = c.get('auth');
  const payload = await parseBody(c, aiSettingsSchema);

  const supabase = getServiceClient();

  const settingValue = {
    provider: payload.provider,
    model: payload.model,
    reasoningModel: payload.reasoningModel,
    tierDefaults: payload.tierDefaults,
    rateLimits: payload.rateLimits,
    externalResearchEnabled: payload.externalResearchEnabled,
    promptVersions: payload.promptVersions,
  };

  const { error } = await supabase.from('app_settings').upsert({
    organization_id: auth.organizationId,
    key: 'ai',
    value: settingValue,
    updated_by: auth.userId,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new HttpError(500, 'database_error', `Failed to update AI settings: ${error.message}`);
  }

  await logActivity(c, {
    action: 'settings.ai_updated',
    entityType: 'app_settings',
    entityId: 'ai',
    metadata: { provider: payload.provider, model: payload.model },
  });

  return c.json({
    ...settingValue,
    apiKeyConfigured: isAiConfigured(),
  });
});

// 5. GET /api/admin/health
adminRoutes.get('/health', requirePermission('admin.jobs'), async (c) => {
  let supabaseReachable = false;
  let failedJobs24h = 0;
  let failedAiRequests24h = 0;

  try {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from('organizations')
      .select('id', { count: 'exact', head: true });

    supabaseReachable = !error;

    if (supabaseReachable) {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count: jobFailures } = await supabase
        .from('generation_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('state', 'failed')
        .gte('created_at', since24h);

      failedJobs24h = jobFailures || 0;

      const { count: aiFailures } = await supabase
        .from('ai_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'error')
        .gte('created_at', since24h);

      failedAiRequests24h = aiFailures || 0;
    }
  } catch (err) {
    console.warn('[health] Supabase health check exception:', err);
  }

  const aiConfigured = isAiConfigured();
  const overallStatus =
    supabaseReachable && aiConfigured ? 'ok' : supabaseReachable ? 'degraded' : 'unhealthy';

  return c.json({
    status: overallStatus,
    supabase: {
      reachable: supabaseReachable,
    },
    ai: {
      configured: aiConfigured,
      provider: serverEnv.aiProvider,
      model: serverEnv.deepseekModel,
    },
    embeddings: {
      provider: serverEnv.embeddingProvider,
      model: serverEnv.embeddingModel,
    },
    metrics: {
      failedJobs24h,
      failedAiRequests24h,
    },
  });
});
