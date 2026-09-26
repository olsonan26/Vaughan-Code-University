import type { AuthContext } from '../context.js';
import { HttpError } from '../lib/errors.js';

/** Mirrors the knowledge_sources RLS policy in TypeScript (server uses the service role after this check). */
export function canReadSource(auth: AuthContext, src: { created_by: string | null; visibility: string; organization_id: string }) {
  if (src.organization_id !== auth.organizationId) return false;
  if (src.created_by === auth.userId) return true;
  if (auth.can('knowledge.manage_all')) return true;
  if ((src.visibility === 'organization' || src.visibility === 'canonical_shared') && auth.can('knowledge.read_shared')) return true;
  return false;
}

export function canEditSource(auth: AuthContext, src: { created_by: string | null; organization_id: string }) {
  if (src.organization_id !== auth.organizationId) return false;
  return src.created_by === auth.userId || auth.can('knowledge.manage_all');
}

export function assertCanRead(auth: AuthContext, src: any) {
  if (!src || !canReadSource(auth, src)) throw new HttpError(404, 'not_found', 'Source not found or you do not have access to it.');
}

export function assertCanEdit(auth: AuthContext, src: any) {
  assertCanRead(auth, src);
  if (!canEditSource(auth, src)) throw new HttpError(403, 'forbidden', 'Only the owner or a knowledge administrator can change this source.');
}

/** Authority 4-5 and canonical visibility are governance decisions (Headmaster/Admin). */
export function assertAuthorityChange(auth: AuthContext, authority?: number, visibility?: string) {
  if ((authority !== undefined && authority >= 4) || visibility === 'canonical_shared') {
    if (!auth.can('knowledge.set_authority')) {
      throw new HttpError(403, 'forbidden', 'Setting authority level 4-5 or Canonical visibility requires the knowledge.set_authority permission (Admin or Headmaster).');
    }
  }
}
