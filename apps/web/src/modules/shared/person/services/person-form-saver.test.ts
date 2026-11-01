import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HomeResponse, PersonResponse } from '@casaecos/shared-types';

import type { HomeService } from '../../home/services/home-service.js';
import type { PersonFormValues } from '../domain/person-form.js';
import { PersonFormSaver, PersonHomesSaveError } from './person-form-saver.js';
import type { PersonService } from './person-service.js';

const values: PersonFormValues = {
  name: 'João Pedro',
  roleId: 5,
  individualRegistration: '',
  phone: '',
  homeIds: [2, 3],
};

const request = { name: 'João Pedro', roleId: 5, individualRegistration: null, phone: null };

const stored: PersonResponse = {
  id: 6,
  name: 'João Pedro',
  role: { id: 5, description: 'Acolhido' },
  individualRegistration: null,
  phone: null,
  hasAccount: false,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

function linkedHome(id: number): HomeResponse {
  return { id } as HomeResponse;
}

const people = {
  create: vi.fn<PersonService['create']>(),
  update: vi.fn<PersonService['update']>(),
  listHomes: vi.fn<PersonService['listHomes']>(),
};
const homes = {
  linkPerson: vi.fn<HomeService['linkPerson']>(),
  unlinkPerson: vi.fn<HomeService['unlinkPerson']>(),
};
const saver = new PersonFormSaver(
  people as unknown as PersonService,
  homes as unknown as HomeService,
);

describe('PersonFormSaver', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    people.create.mockResolvedValue(stored);
    people.update.mockResolvedValue(stored);
    homes.linkPerson.mockResolvedValue({ message: 'ok' });
    homes.unlinkPerson.mockResolvedValue({ message: 'ok' });
  });

  it('cadastra a pessoa e vincula as casas marcadas', async () => {
    await expect(saver.save(null, values)).resolves.toBe(stored);

    expect(people.create).toHaveBeenCalledWith(request);
    expect(people.listHomes).not.toHaveBeenCalled();
    expect(homes.linkPerson.mock.calls).toEqual([
      [2, 6],
      [3, 6],
    ]);
  });

  it('na edição compara com as casas que a API tem, não com as do formulário', async () => {
    people.listHomes.mockResolvedValue([linkedHome(1), linkedHome(2)]);

    await saver.save(6, values);

    expect(people.update).toHaveBeenCalledWith(6, request);
    expect(homes.unlinkPerson.mock.calls).toEqual([[1, 6]]);
    expect(homes.linkPerson.mock.calls).toEqual([[3, 6]]);
  });

  it('avisa que a pessoa foi salva quando uma casa falha, com o id para tentar de novo', async () => {
    homes.linkPerson.mockRejectedValue(new Error('offline'));

    const failure = saver.save(null, values);

    await expect(failure).rejects.toBeInstanceOf(PersonHomesSaveError);
    await expect(failure).rejects.toMatchObject({ personId: 6 });
  });

  it('não chega às casas quando a própria pessoa falha', async () => {
    people.create.mockRejectedValue(new Error('409'));

    await expect(saver.save(null, values)).rejects.toThrow('409');
    expect(homes.linkPerson).not.toHaveBeenCalled();
  });
});
