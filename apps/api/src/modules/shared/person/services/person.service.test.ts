import { beforeEach, describe, expect, it } from 'vitest';

import { AuthenticatedUser } from '../../auth/domain/user-account.js';
import { Person, Role } from '../domain/person.js';
import { ROLE_IDS } from '../domain/role-ids.js';
import {
  DuplicatePhoneError,
  type CreatePersonData,
  type PersonFilters,
  type PersonLinks,
  type PersonRepository,
  type UpdatePersonData,
} from '../repositories/person.repository.js';
import { PersonService } from './person.service.js';

const createdAt = new Date('2026-09-01T10:00:00.000Z');
const updatedAt = new Date('2026-09-02T10:00:00.000Z');

function makeActor(roleId: number): AuthenticatedUser {
  return new AuthenticatedUser({
    personId: 50,
    name: 'Ana Costa',
    email: 'ana@ecos.org',
    role: new Role(roleId, 'Papel de teste'),
    homeIds: [],
  });
}

const coordinator = makeActor(ROLE_IDS.coordinator);
const secretary = makeActor(ROLE_IDS.secretary);

function makePerson(id = 1): Person {
  return new Person({
    id,
    name: 'Maria Silva',
    role: new Role(2, 'Secretário'),
    individualRegistration: null,
    phone: '47999999999',
    createdAt,
    updatedAt,
  });
}

class FakePersonRepository implements PersonRepository {
  people = [makePerson()];
  roles = [new Role(1, 'Coordenador'), new Role(2, 'Secretário')];
  roleAvailable = true;
  phoneInUse = false;
  links: PersonLinks | null = { events: false, homes: false, account: false };
  writeError: Error | null = null;
  receivedFilters: PersonFilters | null = null;
  createdData: CreatePersonData | null = null;
  updatedData: { id: number; data: UpdatePersonData } | null = null;
  excludedPersonId: number | undefined;
  deletedId: number | null = null;

  findAll(filters: PersonFilters): Promise<Person[]> {
    this.receivedFilters = filters;
    return Promise.resolve(this.people);
  }

  findById(id: number): Promise<Person | null> {
    return Promise.resolve(this.people.find((person) => person.id === id) ?? null);
  }

  roleExists(_id: number): Promise<boolean> {
    return Promise.resolve(this.roleAvailable);
  }

  phoneExists(_phone: string, excludedPersonId?: number): Promise<boolean> {
    this.excludedPersonId = excludedPersonId;
    return Promise.resolve(this.phoneInUse);
  }

  create(data: CreatePersonData): Promise<Person> {
    if (this.writeError) return Promise.reject(this.writeError);
    this.createdData = data;
    return Promise.resolve(makePerson());
  }

  update(id: number, data: UpdatePersonData): Promise<Person> {
    if (this.writeError) return Promise.reject(this.writeError);
    this.updatedData = { id, data };
    return Promise.resolve(makePerson(id));
  }

  findLinks(_id: number): Promise<PersonLinks | null> {
    return Promise.resolve(this.links);
  }

  delete(id: number): Promise<void> {
    this.deletedId = id;
    return Promise.resolve();
  }

  listRoles(): Promise<Role[]> {
    return Promise.resolve(this.roles);
  }
}

describe('PersonService', () => {
  let repository: FakePersonRepository;
  let service: PersonService;

  beforeEach(() => {
    repository = new FakePersonRepository();
    service = new PersonService(repository);
  });

  it('lista pessoas com filtros e retorna os dados serializados', async () => {
    const result = await service.list({ roleId: 2, name: 'maria' });

    expect(repository.receivedFilters).toEqual({ roleId: 2, name: 'maria' });
    expect(result).toEqual([
      {
        id: 1,
        name: 'Maria Silva',
        role: { id: 2, description: 'Secretário' },
        individualRegistration: null,
        phone: '47999999999',
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    ]);
  });

  it('busca pessoa por id e informa quando ela não existe', async () => {
    await expect(service.getById(1)).resolves.toMatchObject({ id: 1 });
    await expect(service.getById(99)).rejects.toMatchObject({
      status: 404,
      message: 'Pessoa não encontrada',
    });
  });

  it('cria pessoa normalizando campos opcionais', async () => {
    await service.create(
      {
        name: '  Maria Silva  ',
        roleId: 2,
        individualRegistration: '  123456  ',
        phone: '  ',
      },
      secretary,
    );

    expect(repository.createdData).toEqual({
      name: 'Maria Silva',
      roleId: 2,
      individualRegistration: '123456',
      phone: null,
    });
  });

  it('recusa papel inexistente ao criar ou editar', async () => {
    repository.roleAvailable = false;

    await expect(service.create({ name: 'Maria', roleId: 99 }, coordinator)).rejects.toMatchObject({
      status: 400,
      message: 'Papel informado não existe',
    });
    await expect(service.update(1, { roleId: 99 }, coordinator)).rejects.toMatchObject({
      status: 400,
      message: 'Papel informado não existe',
    });
  });

  it('recusa telefone duplicado, inclusive em conflito concorrente no banco', async () => {
    repository.phoneInUse = true;

    await expect(
      service.create({ name: 'Maria', roleId: 2, phone: '47999999999' }, secretary),
    ).rejects.toMatchObject({ status: 409, message: 'Este telefone já está em uso' });

    repository.phoneInUse = false;
    repository.writeError = new DuplicatePhoneError();

    await expect(
      service.create({ name: 'Maria', roleId: 2, phone: '47999999999' }, secretary),
    ).rejects.toMatchObject({ status: 409, message: 'Este telefone já está em uso' });
  });

  it('edita somente os campos informados e ignora o próprio telefone na unicidade', async () => {
    await service.update(1, { name: '  Maria Souza ', phone: ' 47988888888 ' }, secretary);

    expect(repository.excludedPersonId).toBe(1);
    expect(repository.updatedData).toEqual({
      id: 1,
      data: { name: 'Maria Souza', phone: '47988888888' },
    });
  });

  it('impede excluir pessoa vinculada a eventos ou casas', async () => {
    repository.links = { events: true, homes: true, account: false };

    await expect(service.delete(1, secretary)).rejects.toMatchObject({
      status: 409,
      message: 'Não é possível excluir uma pessoa vinculada a eventos ou casas',
      details: { linkedResources: ['eventos', 'casas'] },
    });
    expect(repository.deletedId).toBeNull();
  });

  it('distingue pessoa inexistente e exclui pessoa sem vínculos', async () => {
    repository.links = null;
    await expect(service.delete(99, secretary)).rejects.toMatchObject({ status: 404 });

    repository.links = { events: false, homes: false, account: false };
    await service.delete(1, secretary);
    expect(repository.deletedId).toBe(1);
  });

  it('só a coordenação cadastra alguém como Coordenador', async () => {
    await expect(
      service.create({ name: 'Maria', roleId: ROLE_IDS.coordinator }, secretary),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Somente a coordenação pode alterar o acesso de quem usa o sistema',
    });
    expect(repository.createdData).toBeNull();

    await service.create({ name: 'Maria', roleId: ROLE_IDS.coordinator }, coordinator);
    expect(repository.createdData).toMatchObject({ roleId: ROLE_IDS.coordinator });
  });

  it('impede a secretaria de promover alguém a Coordenador, inclusive a si mesma', async () => {
    await expect(
      service.update(1, { roleId: ROLE_IDS.coordinator }, secretary),
    ).rejects.toMatchObject({ status: 403 });
    expect(repository.updatedData).toBeNull();
  });

  it('impede a secretaria de trocar o papel de quem tem credencial', async () => {
    repository.links = { events: false, homes: false, account: true };

    await expect(
      service.update(1, { roleId: ROLE_IDS.caregiver }, secretary),
    ).rejects.toMatchObject({ status: 403 });

    await service.update(1, { roleId: ROLE_IDS.caregiver }, coordinator);
    expect(repository.updatedData).toEqual({ id: 1, data: { roleId: ROLE_IDS.caregiver } });
  });

  it('deixa a secretaria trocar o papel de quem não tem credencial', async () => {
    await service.update(1, { roleId: ROLE_IDS.driver }, secretary);

    expect(repository.updatedData).toEqual({ id: 1, data: { roleId: ROLE_IDS.driver } });
  });

  it('deixa a secretaria editar dados de quem tem credencial sem mexer no papel', async () => {
    repository.links = { events: false, homes: false, account: true };

    await service.update(1, { name: 'Maria Souza', roleId: 2 }, secretary);

    expect(repository.updatedData).toEqual({
      id: 1,
      data: { name: 'Maria Souza', roleId: 2 },
    });
  });

  it('só a coordenação exclui pessoa com credencial', async () => {
    repository.links = { events: false, homes: false, account: true };

    await expect(service.delete(1, secretary)).rejects.toMatchObject({ status: 403 });
    expect(repository.deletedId).toBeNull();

    await service.delete(1, coordinator);
    expect(repository.deletedId).toBe(1);
  });

  it('lista os papéis disponíveis', async () => {
    await expect(service.listRoles()).resolves.toEqual([
      { id: 1, description: 'Coordenador' },
      { id: 2, description: 'Secretário' },
    ]);
  });
});
