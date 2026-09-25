import { describe, expect, it } from 'vitest';

import { ROLE_IDS } from '../../person/domain/role-ids.js';
import { AccessScope } from './access-scope.js';

const PERSON_ID = 7;

function scopeFor(roleId: number, homeIds: readonly number[] = [1, 2]): AccessScope {
  return AccessScope.forOwner({ personId: PERSON_ID, roleId, homeIds });
}

describe('AccessScope', () => {
  it.each([
    ['Coordenador', ROLE_IDS.coordinator],
    ['Secretário', ROLE_IDS.secretary],
  ])('%s enxerga todas as casas e eventos, sem filtro', (_label, roleId) => {
    const scope = scopeFor(roleId, []);

    expect(scope.accessibleHomeIds()).toBeNull();
    expect(scope.eventFilter()).toEqual({ kind: 'all' });
    expect(scope.canAccessHome(99)).toBe(true);
    expect(scope.canAccessEvent({ homeId: 99, participantIds: [] })).toBe(true);
  });

  it('cuidador fica restrito às casas às quais está vinculado', () => {
    const scope = scopeFor(ROLE_IDS.caregiver);

    expect(scope.accessibleHomeIds()).toEqual([1, 2]);
    expect(scope.eventFilter()).toEqual({ kind: 'homes', homeIds: [1, 2] });
    expect(scope.canAccessHome(2)).toBe(true);
    expect(scope.canAccessHome(3)).toBe(false);
    expect(scope.canAccessEvent({ homeId: 1, participantIds: [] })).toBe(true);
    expect(scope.canAccessEvent({ homeId: 3, participantIds: [PERSON_ID] })).toBe(false);
  });

  it('cuidador sem vínculo não acessa casa nenhuma', () => {
    const scope = scopeFor(ROLE_IDS.caregiver, []);

    expect(scope.accessibleHomeIds()).toEqual([]);
    expect(scope.eventFilter()).toEqual({ kind: 'homes', homeIds: [] });
    expect(scope.canAccessHome(1)).toBe(false);
  });

  it('papel sem regra própria cai no escopo mais restrito, por casa', () => {
    const scope = scopeFor(ROLE_IDS.sheltered);

    expect(scope.eventFilter()).toEqual({ kind: 'homes', homeIds: [1, 2] });
    expect(scope.canAccessHome(3)).toBe(false);
  });

  it('motorista só acessa os eventos em que participa, independente da casa', () => {
    const scope = scopeFor(ROLE_IDS.driver);

    expect(scope.accessibleHomeIds()).toEqual([]);
    expect(scope.eventFilter()).toEqual({ kind: 'participant', personId: PERSON_ID });
    expect(scope.canAccessHome(1)).toBe(false);
    expect(scope.canAccessEvent({ homeId: 3, participantIds: [PERSON_ID] })).toBe(true);
    expect(scope.canAccessEvent({ homeId: 1, participantIds: [8] })).toBe(false);
  });

  it('responde 403 ao acessar casa ou evento fora do escopo', () => {
    const scope = scopeFor(ROLE_IDS.caregiver);

    expect(() => {
      scope.assertCanAccessHome(3);
    }).toThrow(
      expect.objectContaining({ status: 403, message: 'Você não tem acesso a esta casa' }),
    );
    expect(() => {
      scope.assertCanAccessEvent({ homeId: 3, participantIds: [] });
    }).toThrow(
      expect.objectContaining({ status: 403, message: 'Você não tem acesso a este compromisso' }),
    );
    expect(() => {
      scope.assertCanAccessHome(1);
    }).not.toThrow();
  });
});
