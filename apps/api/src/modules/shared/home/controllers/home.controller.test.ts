import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateHomeRequest, HomeResponse, UpdateHomeRequest } from '@casaecos/shared-types';

import type { AccessScope } from '../../auth/domain/access-scope.js';
import type { HomeFilters } from '../repositories/home.repository.js';

const { listHomes, getHome, createHome, updateHome, deleteHome, linkPerson, unlinkPerson } =
  vi.hoisted(() => ({
    listHomes: vi.fn<(filters: HomeFilters, scope: AccessScope) => Promise<HomeResponse[]>>(),
    getHome: vi.fn<(id: number, scope: AccessScope) => Promise<HomeResponse>>(),
    createHome: vi.fn<(request: CreateHomeRequest) => Promise<HomeResponse>>(),
    updateHome: vi.fn<(id: number, request: UpdateHomeRequest) => Promise<HomeResponse>>(),
    deleteHome: vi.fn<(id: number) => Promise<void>>(),
    linkPerson: vi.fn<(homeId: number, personId: number) => Promise<void>>(),
    unlinkPerson: vi.fn<(homeId: number, personId: number) => Promise<void>>(),
  }));

vi.mock('../../auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

vi.mock('../services/home.service.js', () => ({
  homeService: {
    list: listHomes,
    getById: getHome,
    create: createHome,
    update: updateHome,
    delete: deleteHome,
    linkPerson,
    unlinkPerson,
    listPeople: vi.fn(),
    listHomes: vi.fn(),
  },
}));

import { createApp } from '../../../../app.js';
import { fakeAuthentication } from '../../../../test/fake-authentication.js';
import { ROLE_IDS } from '../../person/domain/role-ids.js';

beforeEach(() => {
  vi.clearAllMocks();
  fakeAuthentication.signInAs(ROLE_IDS.coordinator);
});

describe('GET /homes', () => {
  it('não inventa chave para o filtro omitido', async () => {
    listHomes.mockResolvedValueOnce([]);

    const response = await request(createApp()).get('/homes');

    expect(response.status).toBe(200);
    expect(listHomes.mock.calls[0]?.[0]).toStrictEqual({});
  });

  it('converte o filtro por organização em número', async () => {
    listHomes.mockResolvedValueOnce([]);

    const response = await request(createApp()).get('/homes?organizationId=2');

    expect(response.status).toBe(200);
    expect(listHomes.mock.calls[0]?.[0]).toStrictEqual({ organizationId: 2 });
  });
});

describe('GET /homes/:id', () => {
  it('converte o id da rota em número', async () => {
    const response = await request(createApp()).get('/homes/7');

    expect(response.status).toBe(200);
    expect(getHome.mock.calls[0]?.[0]).toBe(7);
  });
});

describe('POST /homes', () => {
  it('repassa os dados validados ao service', async () => {
    const response = await request(createApp())
      .post('/homes')
      .send({ name: '  Casa Girassol  ', organizationId: 2, responsibleId: 9 });

    expect(response.status).toBe(201);
    expect(createHome.mock.calls[0]?.[0]).toStrictEqual({
      name: 'Casa Girassol',
      organizationId: 2,
      responsibleId: 9,
    });
  });

  it('recusa campo fora do contrato', async () => {
    const response = await request(createApp()).post('/homes').send({
      name: 'Casa Girassol',
      organizationId: 2,
      responsibleId: 9,
      address: 'Endereço inválido',
    });

    expect(response.status).toBe(400);
    expect(createHome).not.toHaveBeenCalled();
  });
});

describe('PATCH /homes/:id', () => {
  it('repassa apenas os campos enviados na edição', async () => {
    const response = await request(createApp())
      .patch('/homes/7')
      .send({ name: '  Casa Girassol  ' });

    expect(response.status).toBe(200);
    expect(updateHome.mock.calls[0]).toStrictEqual([7, { name: 'Casa Girassol' }]);
  });
});

describe('DELETE /homes/:id', () => {
  it('confirma a exclusão da casa', async () => {
    deleteHome.mockResolvedValueOnce();

    const response = await request(createApp()).delete('/homes/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Casa excluída com sucesso' });
    expect(deleteHome).toHaveBeenCalledWith(7);
  });
});

describe('POST /homes/:homeId/people/:personId', () => {
  it('confirma o vínculo de uma pessoa à casa', async () => {
    linkPerson.mockResolvedValueOnce();

    const response = await request(createApp()).post('/homes/7/people/9');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Pessoa vinculada à casa com sucesso' });
    expect(linkPerson).toHaveBeenCalledWith(7, 9);
  });
});

describe('DELETE /homes/:homeId/people/:personId', () => {
  it('confirma a remoção do vínculo', async () => {
    unlinkPerson.mockResolvedValueOnce();

    const response = await request(createApp()).delete('/homes/7/people/9');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Pessoa desvinculada da casa com sucesso' });
    expect(unlinkPerson).toHaveBeenCalledWith(7, 9);
  });
});
