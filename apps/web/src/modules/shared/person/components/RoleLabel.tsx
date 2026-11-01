import type { RoleResponse } from '@casaecos/shared-types';

import { roleGuide } from '../domain/roles.js';

interface RoleLabelProps {
  role: RoleResponse;
}

/** The role as plain text after a dot in its color. */
export function RoleLabel({ role }: RoleLabelProps): React.JSX.Element {
  return (
    <span className={`role-label event-tone--${roleGuide(role.id).tone}`}>{role.description}</span>
  );
}
