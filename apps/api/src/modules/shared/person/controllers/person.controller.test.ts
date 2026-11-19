import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CreatePersonRequest,
  PersonResponse,
  UpdatePersonRequest,
} from '@casaecos/shared-types';

import type { AuthenticatedUser } from '../../auth/domain/user-account.js';
import { HttpError } from '../../../../middlewares/http-error.js';
import type { PersonFilters } from '../repositories/person.repository.js';

const { listPeople, getPerson, createPerson, updatePerson, deletePerson } = vi.hoisted(() => ({
  listPeople: vi.fn<(filters: PersonFilters) => Promise<PersonResponse[]>>(),
  getPerson: vi.fn<(id: number) => Promise<PersonResponse>>(),
  createPerson:
    vi.fn<(request: CreatePersonRequest, actor: AuthenticatedUser) => Promise<PersonResponse>>(),
  updatePerson:
    vi.fn<
      (
        id: number,
        request: UpdatePersonRequest,
        actor: AuthenticatedUser,
      ) => Promise<PersonResponse>
    >(),
  deletePerson: vi.fn<(id: number, actor: AuthenticatedUser) => Promise<void>>(),
}));

vi.mock('../../auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

vi.mock('../services/person.service.js', () => ({
  personService: {
    list: listPeople,
    getById: getPerson,
    create: createPerson,
    update: updatePerson,
    delete: deletePerson,
  },
}));

import { createApp } from '../../../../app.js';
import { fakeAuthentication } from '../../../../test/fake-authentication.js';
import { ROLE_IDS } from '../domain/role-ids.js';

const maria: PersonResponse = {
  id: 7,
  name: 'Maria',
  role: { id: 2, description: 'Cuidadora' },
  individualRegistration: null,
  phone: null,
  hasAccount: false,
  createdAt: '2026-09-23T12:00:00.000Z',
  updatedAt: '2026-09-23T12:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  fakeAuthentication.signInAs(ROLE_IDS.coordinator);
});

describe('GET /people', () => {
  it('repassa os filtros convertidos e omite os ausentes', async () => {
    listPeople.mockResolvedValueOnce([maria]);

    const response = await request(createApp()).get('/people?roleId=2');

    expect(response.status).toBe(200);
    expect(listPeople).toHaveBeenCalledWith({ roleId: 2 });
    expect(listPeople.mock.calls[0]?.[0]).not.toHaveProperty('name');
  });
});

describe('GET /people/:id', () => {
  it('converte o id da rota em número', async () => {
    getPerson.mockResolvedValueOnce(maria);

    const response = await request(createApp()).get('/people/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(maria);
    expect(getPerson).toHaveBeenCalledWith(7);
  });
});

describe('POST /people', () => {
  it('não inventa chave para os campos opcionais omitidos', async () => {
    createPerson.mockResolvedValueOnce(maria);

    const response = await request(createApp())
      .post('/people')
      .send({ name: '  Maria  ', roleId: 2 });

    expect(response.status).toBe(201);
    expect(createPerson.mock.calls[0]?.[0]).toStrictEqual({ name: 'Maria', roleId: 2 });
  });

  it('recusa campo fora do contrato', async () => {
    const response = await request(createApp())
      .post('/people')
      .send({ name: 'Maria', roleId: 2, email: 'maria@ecos.org' });

    expect(response.status).toBe(400);
    expect(createPerson).not.toHaveBeenCalled();
  });
});

describe('PATCH /people/:id', () => {
  it('repassa só os campos enviados, preservando o null que limpa o valor', async () => {
    updatePerson.mockResolvedValueOnce(maria);

    const response = await request(createApp()).patch('/people/7').send({ phone: null });

    expect(response.status).toBe(200);
    expect(updatePerson.mock.calls[0]?.slice(0, 2)).toStrictEqual([7, { phone: null }]);
  });
});

describe('DELETE /people/:id', () => {
  it('confirma a exclusão da pessoa', async () => {
    deletePerson.mockResolvedValueOnce();

    const response = await request(createApp()).delete('/people/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Pessoa excluída com sucesso' });
    expect(deletePerson).toHaveBeenCalledWith(7, expect.anything());
  });
});

describe('testes de integração de pessoas (5 cenários)', () => {
  it('lista pessoas pelo nome informado na requisição HTTP', async () => {
    listPeople.mockResolvedValueOnce([maria]);

    const response = await request(createApp()).get('/people?name=Maria');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([maria]);
    expect(listPeople).toHaveBeenCalledWith({ name: 'Maria' });
  });

  it('cria uma pessoa e encaminha o usuário autenticado ao serviço', async () => {
    createPerson.mockResolvedValueOnce(maria);

    const response = await request(createApp()).post('/people').send({
      name: 'Maria',
      roleId: 2,
      individualRegistration: '123.456.789-09',
      phone: '(47) 99999-0000',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(maria);
    expect(createPerson).toHaveBeenCalledWith(
      {
        name: 'Maria',
        roleId: 2,
        individualRegistration: '123.456.789-09',
        phone: '(47) 99999-0000',
      },
      expect.objectContaining({ personId: 7 }),
    );
  });

  it('aceita PUT para atualizar uma pessoa pela rota da API', async () => {
    updatePerson.mockResolvedValueOnce(maria);

    const response = await request(createApp()).put('/people/7').send({ name: 'Maria Souza' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(maria);
    expect(updatePerson).toHaveBeenCalledWith(
      7,
      { name: 'Maria Souza' },
      expect.objectContaining({ personId: 7 }),
    );
  });

  it('devolve o erro de pessoa não encontrada pelo contrato HTTP', async () => {
    getPerson.mockRejectedValueOnce(HttpError.notFound('Pessoa não encontrada'));

    const response = await request(createApp()).get('/people/99');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Pessoa não encontrada' });
  });

  it('devolve o conflito ao tentar excluir uma pessoa vinculada', async () => {
    deletePerson.mockRejectedValueOnce(
      HttpError.conflict('Não é possível excluir uma pessoa vinculada a eventos ou casas', {
        linkedResources: ['casas'],
      }),
    );

    const response = await request(createApp()).delete('/people/7');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: 'Não é possível excluir uma pessoa vinculada a eventos ou casas',
      details: { linkedResources: ['casas'] },
    });
  });
});
