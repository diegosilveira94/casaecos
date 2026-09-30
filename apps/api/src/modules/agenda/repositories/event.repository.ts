import { prisma } from '../../../config/prisma.js';
import type { Prisma } from '../../../generated/prisma/client.js';
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

export interface EventRepository {
  findById(id: number): Promise<Event | null>;
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

export class PrismaEventRepository implements EventRepository {
  async findById(id: number): Promise<Event | null> {
    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null },
      select: eventSelection,
    });
    return event ? toEvent(event) : null;
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
