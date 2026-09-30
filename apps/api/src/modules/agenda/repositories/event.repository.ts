import { prisma } from '../../../config/prisma.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { pageOffset, type PageRequest } from '../../../shared/pagination.js';
import type { EventScopeFilter } from '../../shared/auth/domain/access-scope.js';
import { HomeSummary } from '../../shared/home/domain/home.js';
import { Event, EventType } from '../domain/event.js';

export interface CreateEventData {
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  address: string | null;
  eventTypeId: number;
  homeId: number;
}

export interface UpdateEventData {
  title?: string;
  description?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  address?: string | null;
  eventTypeId?: number;
  homeId?: number;
}

/** `startsFrom` is inclusive and `startsBefore` exclusive, so consecutive periods never overlap. */
export interface EventListCriteria {
  scope: EventScopeFilter;
  homeId?: number;
  eventTypeId?: number;
  startsFrom?: Date;
  startsBefore?: Date;
}

export interface EventPage {
  events: Event[];
  total: number;
}

export interface EventRepository {
  findPage(criteria: EventListCriteria, page: PageRequest): Promise<EventPage>;
  findById(id: number): Promise<Event | null>;
  listEventTypes(): Promise<EventType[]>;
  eventTypeExists(id: number): Promise<boolean>;
  homeExists(id: number): Promise<boolean>;
  create(data: CreateEventData): Promise<Event>;
  update(id: number, data: UpdateEventData): Promise<Event>;
  softDelete(id: number): Promise<void>;
}

const eventSelection = {
  id: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  address: true,
  createdAt: true,
  updatedAt: true,
  eventType: { select: { id: true, name: true } },
  home: { select: { id: true, name: true } },
  personLinks: { select: { personId: true } },
} satisfies Prisma.EventSelect;

type EventRecord = Prisma.EventGetPayload<{ select: typeof eventSelection }>;

function toEvent(record: EventRecord): Event {
  return new Event({
    id: record.id,
    title: record.title,
    description: record.description,
    startDate: record.startDate,
    endDate: record.endDate,
    address: record.address,
    eventType: new EventType(record.eventType.id, record.eventType.name),
    home: new HomeSummary(record.home.id, record.home.name),
    participantIds: record.personLinks.map((link) => link.personId),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function scopeWhere(scope: EventScopeFilter): Prisma.EventWhereInput {
  switch (scope.kind) {
    case 'all':
      return {};
    case 'homes':
      return { homeId: { in: [...scope.homeIds] } };
    case 'participant':
      return { personLinks: { some: { personId: scope.personId } } };
  }
}

// AND keeps the scope and the homeId filter as separate conditions: a home outside
// the scope narrows the result to nothing instead of replacing the scope.
function listWhere(criteria: EventListCriteria): Prisma.EventWhereInput {
  const { homeId, eventTypeId, startsFrom, startsBefore } = criteria;
  return {
    deletedAt: null,
    AND: [
      scopeWhere(criteria.scope),
      homeId === undefined ? {} : { homeId },
      eventTypeId === undefined ? {} : { eventTypeId },
      startsFrom === undefined ? {} : { startDate: { gte: startsFrom } },
      startsBefore === undefined ? {} : { startDate: { lt: startsBefore } },
    ],
  };
}

export class PrismaEventRepository implements EventRepository {
  async findPage(criteria: EventListCriteria, page: PageRequest): Promise<EventPage> {
    const where = listWhere(criteria);
    // No $transaction: inside one, Prisma loads the relations concurrently on the same
    // pg client, which pg deprecates. A total that misses a concurrent write is harmless.
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: eventSelection,
        orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
        skip: pageOffset(page),
        take: page.pageSize,
      }),
      prisma.event.count({ where }),
    ]);
    return { events: events.map(toEvent), total };
  }

  async findById(id: number): Promise<Event | null> {
    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null },
      select: eventSelection,
    });
    return event ? toEvent(event) : null;
  }

  async listEventTypes(): Promise<EventType[]> {
    const eventTypes = await prisma.eventType.findMany({ orderBy: { id: 'asc' } });
    return eventTypes.map((eventType) => new EventType(eventType.id, eventType.name));
  }

  async eventTypeExists(id: number): Promise<boolean> {
    return (await prisma.eventType.findUnique({ where: { id }, select: { id: true } })) !== null;
  }

  async homeExists(id: number): Promise<boolean> {
    return (await prisma.home.findUnique({ where: { id }, select: { id: true } })) !== null;
  }

  async create(data: CreateEventData): Promise<Event> {
    return toEvent(await prisma.event.create({ data, select: eventSelection }));
  }

  // `deletedAt: null` in the where: an event removed after the service loaded it
  // fails with P2025, which becomes 404, instead of being edited back.
  async update(id: number, data: UpdateEventData): Promise<Event> {
    const event = await prisma.event.update({
      where: { id, deletedAt: null },
      data,
      select: eventSelection,
    });
    return toEvent(event);
  }

  // The row and its person_event links stay: reports and accountability read them.
  async softDelete(id: number): Promise<void> {
    await prisma.event.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  }
}
