import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CreatePersonRequest,
  PersonResponse,
  UpdatePersonRequest,
} from '@casaecos/shared-types';

import type { PersonFilters } from '../repositories/person.repository.js';

const { listPeople, getPerson, createPerson, updatePerson, deletePerson } = vi.hoisted(() => ({
  listPeople: vi.fn<(filters: PersonFilters) => Promise<PersonResponse[]>>(),
  getPerson: vi.fn<(id: number) => Promise<PersonResponse>>(),
  createPerson: vi.fn<(request: CreatePersonRequest) => Promise<PersonResponse>>(),
  updatePerson: vi.fn<(id: number, request: UpdatePersonRequest) => Promise<PersonResponse>>(),
  deletePerson: vi.fn<(id: number) => Promise<void>>(),
}));

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

const maria: PersonResponse = {
  id: 7,
  name: 'Maria',
  role: { id: 2, description: 'Cuidadora' },
  individualRegistration: null,
  phone: null,
  createdAt: '2026-09-23T12:00:00.000Z',
  updatedAt: '2026-09-23T12:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
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
    expect(updatePerson.mock.calls[0]).toStrictEqual([7, { phone: null }]);
  });
});

describe('DELETE /people/:id', () => {
  it('confirma a exclusão da pessoa', async () => {
    deletePerson.mockResolvedValueOnce();

    const response = await request(createApp()).delete('/people/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Pessoa excluída com sucesso' });
    expect(deletePerson).toHaveBeenCalledWith(7);
  });
});
