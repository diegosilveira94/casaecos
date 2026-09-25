import { prisma } from '../../../../config/prisma.js';
import { Prisma } from '../../../../generated/prisma/client.js';
import { Person, Role } from '../../person/domain/person.js';
import { Home, OrganizationSummary } from '../domain/home.js';

export interface HomeFilters {
  organizationId?: number;
}

export interface CreateHomeData {
  name: string;
  organizationId: number;
  responsibleId: number;
}

export interface UpdateHomeData {
  name?: string;
  organizationId?: number;
  responsibleId?: number;
}

export interface HomeRepository {
  findAll(filters: HomeFilters): Promise<Home[]>;
  findById(id: number): Promise<Home | null>;
  organizationExists(id: number): Promise<boolean>;
  personExists(id: number): Promise<boolean>;
  create(data: CreateHomeData): Promise<Home>;
  update(id: number, data: UpdateHomeData): Promise<Home>;
  hasEvents(id: number): Promise<boolean | null>;
  delete(id: number): Promise<void>;
  linkPerson(homeId: number, personId: number): Promise<void>;
  unlinkPerson(homeId: number, personId: number): Promise<boolean>;
  listPeople(homeId: number): Promise<Person[]>;
  listHomes(personId: number): Promise<Home[]>;
}

export class DuplicateHomePersonError extends Error {
  constructor() {
    super('Home and person are already linked');
    this.name = 'DuplicateHomePersonError';
  }
}

export class HomeHasEventsError extends Error {
  constructor() {
    super('Home has linked events');
    this.name = 'HomeHasEventsError';
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

const homeSelection = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  organization: { select: { id: true, name: true } },
  responsible: { select: personSelection },
} satisfies Prisma.HomeSelect;

type PersonRecord = Prisma.PersonGetPayload<{ select: typeof personSelection }>;
type HomeRecord = Prisma.HomeGetPayload<{ select: typeof homeSelection }>;

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

function toHome(record: HomeRecord): Home {
  return new Home({
    id: record.id,
    name: record.name,
    organization: new OrganizationSummary(record.organization.id, record.organization.name),
    responsible: toPerson(record.responsible),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export class PrismaHomeRepository implements HomeRepository {
  async findAll(filters: HomeFilters): Promise<Home[]> {
    const homes = await prisma.home.findMany({
      ...(filters.organizationId === undefined
        ? {}
        : { where: { organizationId: filters.organizationId } }),
      select: homeSelection,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return homes.map(toHome);
  }

  async findById(id: number): Promise<Home | null> {
    const home = await prisma.home.findUnique({ where: { id }, select: homeSelection });
    return home ? toHome(home) : null;
  }

  async organizationExists(id: number): Promise<boolean> {
    return (await prisma.organization.findUnique({ where: { id }, select: { id: true } })) !== null;
  }

  async personExists(id: number): Promise<boolean> {
    return (await prisma.person.findUnique({ where: { id }, select: { id: true } })) !== null;
  }

  async create(data: CreateHomeData): Promise<Home> {
    const home = await prisma.home.create({ data, select: homeSelection });
    return toHome(home);
  }

  async update(id: number, data: UpdateHomeData): Promise<Home> {
    const home = await prisma.home.update({ where: { id }, data, select: homeSelection });
    return toHome(home);
  }

  async hasEvents(id: number): Promise<boolean | null> {
    const home = await prisma.home.findUnique({
      where: { id },
      select: { _count: { select: { events: true } } },
    });
    return home ? home._count.events > 0 : null;
  }

  async delete(id: number): Promise<void> {
    try {
      await prisma.home.delete({ where: { id } });
    } catch (error: unknown) {
      if (isPrismaError(error, 'P2003')) throw new HomeHasEventsError();
      throw error;
    }
  }

  async linkPerson(homeId: number, personId: number): Promise<void> {
    try {
      await prisma.homePerson.create({ data: { homeId, personId } });
    } catch (error: unknown) {
      if (isPrismaError(error, 'P2002')) throw new DuplicateHomePersonError();
      throw error;
    }
  }

  async unlinkPerson(homeId: number, personId: number): Promise<boolean> {
    const result = await prisma.homePerson.deleteMany({ where: { homeId, personId } });
    return result.count > 0;
  }

  async listPeople(homeId: number): Promise<Person[]> {
    const links = await prisma.homePerson.findMany({
      where: { homeId },
      select: { person: { select: personSelection } },
      orderBy: [{ person: { name: 'asc' } }, { personId: 'asc' }],
    });
    return links.map((link) => toPerson(link.person));
  }

  async listHomes(personId: number): Promise<Home[]> {
    const links = await prisma.homePerson.findMany({
      where: { personId },
      select: { home: { select: homeSelection } },
      orderBy: [{ home: { name: 'asc' } }, { homeId: 'asc' }],
    });
    return links.map((link) => toHome(link.home));
  }
}
