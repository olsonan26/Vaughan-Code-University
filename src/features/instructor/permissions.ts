import { usePermissions } from '../../lib/permissions';
import type { Permission } from '../../../shared/auth/permissions';

/** Studio-side permission hook (UI visibility only; the server enforces). */
export function useStudioPermissions(): { can(p: Permission): boolean } {
  const { can } = usePermissions();
  return { can };
}

export default useStudioPermissions;
