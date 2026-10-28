import { Navigate } from 'react-router';

import type { Permission } from '@casaecos/shared-types';

import { useAuth } from '../context/use-auth.js';

interface RequirePermissionProps {
  permission: Permission;
  children: React.ReactNode;
}

/**
 * A screen the role cannot use goes back to the agenda, which every logged-in role
 * has. The API refuses the calls anyway: this only spares a screen full of 403s.
 */
export function RequirePermission({
  permission,
  children,
}: RequirePermissionProps): React.JSX.Element {
  const { can } = useAuth();

  return can(permission) ? <>{children}</> : <Navigate to="/agenda" replace />;
}
