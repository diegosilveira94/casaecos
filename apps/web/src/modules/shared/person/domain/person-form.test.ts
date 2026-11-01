import { describe, expect, it } from 'vitest';

import type { PersonResponse } from '@casaecos/shared-types';

import {
  emptyPersonForm,
  hasPersonFormChanges,
  homeLinkChanges,
  personFormFrom,
  toPersonRequest,
  validatePersonForm,
} from './person-form.js';

const joao: PersonResponse = {
  id: 6,
  name: 'João Pedro',
  role: { id: 5, description: 'Acolhido' },
  individualRegistration: '123.456.789-09',
  phone: null,
  hasAccount: false,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

describe('formulário de pessoa', () => {
  it('exige nome e papel', () => {
    expect(validatePersonForm(emptyPersonForm())).toEqual({
      name: 'Informe o nome.',
      roleId: 'Escolha o papel.',
    });
    expect(validatePersonForm({ ...emptyPersonForm(), name: '  ' }).name).toBe('Informe o nome.');
  });

  it('apara o texto e manda opcional em branco como null', () => {
    expect(
      toPersonRequest({
        name: '  Maria Clara ',
        roleId: 5,
        individualRegistration: ' ',
        phone: ' (47) 99999-0000 ',
        homeIds: [1],
      }),
    ).toEqual({
      name: 'Maria Clara',
      roleId: 5,
      individualRegistration: null,
      phone: '(47) 99999-0000',
    });
  });

  it('parte da pessoa salva, com as casas dela', () => {
    expect(personFormFrom(joao, [2])).toEqual({
      name: 'João Pedro',
      roleId: 5,
      individualRegistration: '123.456.789-09',
      phone: '',
      homeIds: [2],
    });
  });

  it('percebe alteração nas casas, em qualquer ordem', () => {
    const initial = personFormFrom(joao, [1, 2]);

    expect(hasPersonFormChanges(initial, { ...initial, homeIds: [2, 1] })).toBe(false);
    expect(hasPersonFormChanges(initial, { ...initial, homeIds: [1] })).toBe(true);
    expect(hasPersonFormChanges(initial, { ...initial, phone: '47' })).toBe(true);
  });

  it('separa as casas a vincular e a desvincular', () => {
    expect(homeLinkChanges([1, 2], [2, 3])).toEqual({ toLink: [3], toUnlink: [1] });
  });
});
