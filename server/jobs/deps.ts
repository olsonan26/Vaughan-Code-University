/** Server dependencies used by the job engine (wired to the real platform modules). */
export { HttpError } from '../lib/errors.js';
export { requireAuth, requirePermission } from '../middleware/auth.js';
export { getServiceClient } from '../lib/supabase.js';
