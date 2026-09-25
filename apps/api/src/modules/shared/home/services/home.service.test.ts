import { beforeEach, describe, expect, it } from 'vitest';

import { Person, Role } from '../../person/domain/person.js';
import { Home, OrganizationSummary } from '../domain/home.js';
import {
  DuplicateHomePersonError,
  HomeHasEventsError,
  type CreateHomeData,
  type HomeFilters,
  type HomeRepository,
  type UpdateHomeData,
} from '../repositories/home.repository.js';
import { HomeService } from './home.service.js';

const createdAt = new Date('2026-09-01T10:00:00.000Z');
const updatedAt = new Date('2026-09-02T10:00:00.000Z');

function makePerson(id = 2): Person {
  return new Person({
    id,
    name: 'Maria Silva',
    role: new Role(1, 'Coordenador'),
    individualRegistration: null,
    phone: null,
    createdAt,
    updatedAt,
  });
}

function makeHome(id = 1): Home {
  return new Home({
    id,
    name: 'Casa Girassol',
    organization: new OrganizationSummary(3, 'Ecos da Esperança'),
    responsible: makePerson(),
    createdAt,
    updatedAt,
  });
}

class FakeHomeRepository implements HomeRepository {
  homes = [makeHome()];
  people = [makePerson()];
  organizationAvailable = true;
  personAvailable = true;
  events: boolean | null = false;
  linkCreated: { homeId: number; personId: number } | null = null;
  linkRemoved = true;
  writeError: Error | null = null;
  receivedFilters: HomeFilters | null = null;
  createdData: CreateHomeData | null = null;
  updatedData: { id: number; data: UpdateHomeData } | null = null;
  deletedId: number | null = null;

  findAll(filters: HomeFilters): Promise<Home[]> {
    this.receivedFilters = filters;
    return Promise.resolve(this.homes);
  }

  findById(id: number): Promise<Home | null> {
    return Promise.resolve(this.homes.find((home) => home.id === id) ?? null);
  }

  organizationExists(_id: number): Promise<boolean> {
    return Promise.resolve(this.organizationAvailable);
  }

  personExists(_id: number): Promise<boolean> {
    return Promise.resolve(this.personAvailable);
  }

  create(data: CreateHomeData): Promise<Home> {
    this.createdData = data;
    return Promise.resolve(makeHome());
  }

  update(id: number, data: UpdateHomeData): Promise<Home> {
    this.updatedData = { id, data };
    return Promise.resolve(makeHome(id));
  }

  hasEvents(_id: number): Promise<boolean | null> {
    return Promise.resolve(this.events);
  }

  delete(id: number): Promise<void> {
    if (this.writeError) return Promise.reject(this.writeError);
    this.deletedId = id;
    return Promise.resolve();
  }

  linkPerson(homeId: number, personId: number): Promise<void> {
    if (this.writeError) return Promise.reject(this.writeError);
    this.linkCreated = { homeId, personId };
    return Promise.resolve();
  }

  unlinkPerson(_homeId: number, _personId: number): Promise<boolean> {
    return Promise.resolve(this.linkRemoved);
  }

  listPeople(_homeId: number): Promise<Person[]> {
    return Promise.resolve(this.people);
  }

  listHomes(_personId: number): Promise<Home[]> {
    return Promise.resolve(this.homes);
  }
}

describe('HomeService', () => {
  let repository: FakeHomeRepository;
  let service: HomeService;

  beforeEach(() => {
    repository = new FakeHomeRepository();
    service = new HomeService(repository);
  });

  it('lista casas por organização e serializa seus relacionamentos', async () => {
    const result = await service.list({ organizationId: 3 });

    expect(repository.receivedFilters).toEqual({ organizationId: 3 });
    expect(result[0]).toMatchObject({
      id: 1,
      name: 'Casa Girassol',
      organization: { id: 3, name: 'Ecos da Esperança' },
      responsible: { id: 2, name: 'Maria Silva' },
    });
  });

  it('busca uma casa por id e informa quando ela não existe', async () => {
    await expect(service.getById(1)).resolves.toMatchObject({ id: 1 });
    await expect(service.getById(99)).rejects.toMatchObject({
      status: 404,
      message: 'Casa não encontrada',
    });
  });

  it('cria uma casa vinculada à organização e ao responsável', async () => {
    await service.create({
      name: '  Casa Girassol  ',
      organizationId: 3,
      responsibleId: 2,
    });

    expect(repository.createdData).toEqual({
      name: 'Casa Girassol',
      organizationId: 3,
      responsibleId: 2,
    });
  });

  it('recusa organização ou responsável inexistente', async () => {
    repository.organizationAvailable = false;
    await expect(
      service.create({ name: 'Casa', organizationId: 99, responsibleId: 2 }),
    ).rejects.toMatchObject({ status: 400, message: 'Organização informada não existe' });

    repository.organizationAvailable = true;
    repository.personAvailable = false;
    await expect(
      service.create({ name: 'Casa', organizationId: 3, responsibleId: 99 }),
    ).rejects.toMatchObject({ status: 400, message: 'Responsável informado não existe' });
  });

  it('edita somente os campos informados', async () => {
    await service.update(1, { name: '  Casa Horizonte ', responsibleId: 4 });

    expect(repository.updatedData).toEqual({
      id: 1,
      data: { name: 'Casa Horizonte', responsibleId: 4 },
    });
  });

  it('impede excluir uma casa com eventos, inclusive em conflito concorrente', async () => {
    repository.events = true;
    await expect(service.delete(1)).rejects.toMatchObject({
      status: 409,
      message: 'Não é possível excluir uma casa com eventos vinculados',
    });

    repository.events = false;
    repository.writeError = new HomeHasEventsError();
    await expect(service.delete(1)).rejects.toMatchObject({ status: 409 });
  });

  it('distingue casa inexistente e exclui casa sem eventos', async () => {
    repository.events = null;
    await expect(service.delete(99)).rejects.toMatchObject({ status: 404 });

    repository.events = false;
    await service.delete(1);
    expect(repository.deletedId).toBe(1);
  });

  it('vincula uma pessoa e recusa vínculo duplicado', async () => {
    await service.linkPerson(1, 2);
    expect(repository.linkCreated).toEqual({ homeId: 1, personId: 2 });

    repository.writeError = new DuplicateHomePersonError();
    await expect(service.linkPerson(1, 2)).rejects.toMatchObject({
      status: 409,
      message: 'Pessoa já está vinculada a esta casa',
    });
  });

  it('desvincula uma pessoa e informa quando o vínculo não existe', async () => {
    await expect(service.unlinkPerson(1, 2)).resolves.toBeUndefined();

    repository.linkRemoved = false;
    await expect(service.unlinkPerson(1, 2)).rejects.toMatchObject({
      status: 404,
      message: 'Vínculo entre pessoa e casa não encontrado',
    });
  });

  it('lista pessoas de uma casa e casas de uma pessoa', async () => {
    await expect(service.listPeople(1)).resolves.toMatchObject([{ id: 2 }]);
    await expect(service.listHomes(2)).resolves.toMatchObject([{ id: 1 }]);
  });
});
