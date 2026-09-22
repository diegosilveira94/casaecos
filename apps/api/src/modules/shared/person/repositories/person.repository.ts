import { Prisma } from '../../../../generated/prisma/client.js';
import { prisma } from '../../../../config/prisma.js';
import { Person, Role } from '../domain/person.js';

export interface PersonFilters {
  roleId?: number;
  name?: string;
}

export interface CreatePersonData {
  name: string;
  roleId: number;
  individualRegistration: string | null;
  phone: string | null;
}

export interface UpdatePersonData {
  name?: string;
  roleId?: number;
  individualRegistration?: string | null;
  phone?: string | null;
}

export interface PersonLinks {
  events: boolean;
  homes: boolean;
}

export interface PersonRepository {
  findAll(filters: PersonFilters): Promise<Person[]>;
  findById(id: number): Promise<Person | null>;
  roleExists(id: number): Promise<boolean>;
  phoneExists(phone: string, excludedPersonId?: number): Promise<boolean>;
  create(data: CreatePersonData): Promise<Person>;
  update(id: number, data: UpdatePersonData): Promise<Person>;
  findLinks(id: number): Promise<PersonLinks | null>;
  delete(id: number): Promise<void>;
  listRoles(): Promise<Role[]>;
}

export class DuplicatePhoneError extends Error {
  constructor() {
    super('Phone already exists');
    this.name = 'DuplicatePhoneError';
  }
}

const personSelection = {
  id: true,
  name: true,
  individualRegistration: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, description: true } },
} satisfies Prisma.PersonSelect;

type PersonRecord = Prisma.PersonGetPayload<{ select: typeof personSelection }>;

function toPerson(record: PersonRecord): Person {
  return new Person({
    id: record.id,
    name: record.name,
    role: new Role(record.role.id, record.role.description),
    individualRegistration: record.individualRegistration,
    phone: record.phone,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export class PrismaPersonRepository implements PersonRepository {
  async findAll(filters: PersonFilters): Promise<Person[]> {
    const people = await prisma.person.findMany({
      where: {
        ...(filters.roleId === undefined ? {} : { roleId: filters.roleId }),
        ...(filters.name === undefined
          ? {}
          : { name: { contains: filters.name, mode: 'insensitive' } }),
      },
      select: personSelection,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return people.map(toPerson);
  }

  async findById(id: number): Promise<Person | null> {
    const person = await prisma.person.findUnique({
      where: { id },
      select: personSelection,
    });

    return person ? toPerson(person) : null;
  }

  async roleExists(id: number): Promise<boolean> {
    const role = await prisma.role.findUnique({ where: { id }, select: { id: true } });
    return role !== null;
  }

  async phoneExists(phone: string, excludedPersonId?: number): Promise<boolean> {
    const person = await prisma.person.findFirst({
      where: {
        phone,
        ...(excludedPersonId === undefined ? {} : { id: { not: excludedPersonId } }),
      },
      select: { id: true },
    });

    return person !== null;
  }

  async create(data: CreatePersonData): Promise<Person> {
    try {
      const person = await prisma.person.create({ data, select: personSelection });
      return toPerson(person);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) throw new DuplicatePhoneError();
      throw error;
    }
  }

  async update(id: number, data: UpdatePersonData): Promise<Person> {
    try {
      const person = await prisma.person.update({ where: { id }, data, select: personSelection });
      return toPerson(person);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) throw new DuplicatePhoneError();
      throw error;
    }
  }

  async findLinks(id: number): Promise<PersonLinks | null> {
    const person = await prisma.person.findUnique({
      where: { id },
      select: {
        _count: {
          select: { eventLinks: true, homeLinks: true, homesUnderCharge: true },
        },
      },
    });

    if (!person) return null;

    return {
      events: person._count.eventLinks > 0,
      homes: person._count.homeLinks > 0 || person._count.homesUnderCharge > 0,
    };
  }

  async delete(id: number): Promise<void> {
    await prisma.person.delete({ where: { id } });
  }

  async listRoles(): Promise<Role[]> {
    const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
    return roles.map((role) => new Role(role.id, role.description));
  }
}
