// TEMPORARY: coordinator rewires to usePermissions()/useAuth().can
import { useApp } from '../../context/AppContext';
import type { Permission } from '../../../shared/auth/permissions';

export function useStudioPermissions(): { can(p: Permission): boolean } {
  const { currentUser } = useApp();

  const can = (_permission: Permission): boolean => {
    // TEMPORARY: derives from legacy useApp().currentUser.role ('creator' => all studio + admin perms; else none)
    if (currentUser?.role === 'creator') {
      return true;
    }
    return false;
  };

  return { can };
}

export default useStudioPermissions;
