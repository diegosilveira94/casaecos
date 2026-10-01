import { describe, expect, it } from 'vitest';

import type { Permission } from '@casaecos/shared-types';

import { ROLE_IDS } from '../../person/domain/role-ids.js';
import { permissionsForRole, roleHasPermission } from './permissions.js';

const { coordinator, secretary, caregiver, driver, sheltered } = ROLE_IDS;

const expectedRoleIds: Record<Permission, readonly number[]> = {
  'account:manage': [coordinator],
  'person:read': [coordinator, secretary],
  'person:write': [coordinator, secretary],
  'home:read': [coordinator, secretary, caregiver],
  'home:write': [coordinator, secretary],
  'event:read': [coordinator, secretary, caregiver, driver],
  'event:write': [coordinator, secretary],
};

const allRoleIds = [coordinator, secretary, caregiver, driver, sheltered];

describe('matriz de permissões', () => {
  it.each(Object.entries(expectedRoleIds) as [Permission, readonly number[]][])(
    '%s libera exatamente os papéis esperados',
    (permission, allowedRoleIds) => {
      const granted = allRoleIds.filter((roleId) => roleHasPermission(roleId, permission));

      expect(granted).toEqual(allowedRoleIds);
    },
  );

  it('nega tudo a papel desconhecido', () => {
    const permissions = Object.keys(expectedRoleIds) as Permission[];

    expect(permissions.some((permission) => roleHasPermission(99, permission))).toBe(false);
  });

  it('lista as permissões de cada papel, coerente com a matriz', () => {
    for (const roleId of allRoleIds) {
      const expected = (Object.keys(expectedRoleIds) as Permission[]).filter((permission) =>
        expectedRoleIds[permission].includes(roleId),
      );

      expect(permissionsForRole(roleId)).toEqual(expected);
    }
  });

  it('motorista só tem a leitura de eventos', () => {
    expect(permissionsForRole(driver)).toEqual(['event:read']);
  });
});
