import type { Permission } from '@casaecos/shared-types';

import { ROLE_IDS } from '../../person/domain/role-ids.js';

const COORDINATION_ROLE_IDS = [ROLE_IDS.coordinator, ROLE_IDS.secretary];
// The collaborator is a stand-in for any staff gap, so it starts with the caregiver's
// reading access; more than that is a matter of changing the person's role.
const HOME_STAFF_ROLE_IDS = [ROLE_IDS.caregiver, ROLE_IDS.collaborator];

const ALLOWED_ROLE_IDS: Record<Permission, ReadonlySet<number>> = {
  'account:manage': new Set([ROLE_IDS.coordinator]),
  'person:read': new Set(COORDINATION_ROLE_IDS),
  'person:write': new Set(COORDINATION_ROLE_IDS),
  'home:read': new Set([...COORDINATION_ROLE_IDS, ...HOME_STAFF_ROLE_IDS]),
  'home:write': new Set(COORDINATION_ROLE_IDS),
  'event:read': new Set([...COORDINATION_ROLE_IDS, ...HOME_STAFF_ROLE_IDS, ROLE_IDS.driver]),
  'event:write': new Set(COORDINATION_ROLE_IDS),
};

export type ScopeKind = 'all' | 'homes' | 'participant';

const SCOPE_KIND_BY_ROLE_ID: ReadonlyMap<number, ScopeKind> = new Map<number, ScopeKind>([
  [ROLE_IDS.coordinator, 'all'],
  [ROLE_IDS.secretary, 'all'],
  [ROLE_IDS.driver, 'participant'],
]);

export function roleHasPermission(roleId: number, permission: Permission): boolean {
  return ALLOWED_ROLE_IDS[permission].has(roleId);
}

export function permissionsForRole(roleId: number): Permission[] {
  const permissions = Object.keys(ALLOWED_ROLE_IDS) as Permission[];
  return permissions.filter((permission) => roleHasPermission(roleId, permission));
}

export function scopeKindForRole(roleId: number): ScopeKind {
  return SCOPE_KIND_BY_ROLE_ID.get(roleId) ?? 'homes';
}
