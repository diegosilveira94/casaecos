import type {
  CreateEventRequest,
  EventResponse,
  EventTypeResponse,
  ListEventsQuery,
  Paginated,
  UpdateEventRequest,
} from '@casaecos/shared-types';

import { HttpError } from '../../../middlewares/http-error.js';
import { normalizeOptionalText } from '../../../shared/optional-text.js';
import type { PageRequest } from '../../../shared/pagination.js';
import type { AccessScope } from '../../shared/auth/domain/access-scope.js';
import type { Event } from '../domain/event.js';
import {
  PrismaEventRepository,
  type CreateEventData,
  type EventListCriteria,
  type EventRepository,
  type UpdateEventData,
} from '../repositories/event.repository.js';

/** What the route hands over after validation: the pagination defaults are already applied. */
export type ListEventsRequest = ListEventsQuery & PageRequest;

const END_NOT_AFTER_START_MESSAGE = 'O término do compromisso precisa ser depois do início';

function toNullableDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

export class EventService {
  constructor(private readonly repository: EventRepository) {}

  async list(request: ListEventsRequest, scope: AccessScope): Promise<Paginated<EventResponse>> {
    const { from, to, page, pageSize, ...filters } = request;
    const criteria: EventListCriteria = {
      ...filters,
      scope: scope.eventFilter(),
      ...(from === undefined ? {} : { startsFrom: new Date(from) }),
      ...(to === undefined ? {} : { startsBefore: new Date(to) }),
    };

    const { events, total } = await this.repository.findPage(criteria, { page, pageSize });
    return { items: events.map((event) => event.toResponse()), page, pageSize, total };
  }

  async listEventTypes(): Promise<EventTypeResponse[]> {
    const eventTypes = await this.repository.listEventTypes();
    return eventTypes.map((eventType) => eventType.toResponse());
  }

  async getById(id: number, scope: AccessScope): Promise<EventResponse> {
    return (await this.findAccessibleEvent(id, scope)).toResponse();
  }

  async create(request: CreateEventRequest, scope: AccessScope): Promise<EventResponse> {
    const startDate = new Date(request.startDate);
    const endDate = toNullableDate(request.endDate);
    this.ensureEndsAfterStart(startDate, endDate);

    scope.assertCanAccessHome(request.homeId);
    await Promise.all([
      this.ensureHomeExists(request.homeId),
      this.ensureEventTypeExists(request.eventTypeId),
    ]);

    const data: CreateEventData = {
      title: request.title.trim(),
      description: normalizeOptionalText(request.description) ?? null,
      startDate,
      endDate,
      address: normalizeOptionalText(request.address) ?? null,
      eventTypeId: request.eventTypeId,
      homeId: request.homeId,
    };
    return (await this.repository.create(data)).toResponse();
  }

  async update(
    id: number,
    request: UpdateEventRequest,
    scope: AccessScope,
  ): Promise<EventResponse> {
    const event = await this.findAccessibleEvent(id, scope);

    const data: UpdateEventData = {};
    if (request.title !== undefined) data.title = request.title.trim();
    if (request.description !== undefined) {
      data.description = normalizeOptionalText(request.description) ?? null;
    }
    if (request.startDate !== undefined) data.startDate = new Date(request.startDate);
    if (request.endDate !== undefined) data.endDate = toNullableDate(request.endDate);
    if (request.address !== undefined)
      data.address = normalizeOptionalText(request.address) ?? null;
    if (request.eventTypeId !== undefined) data.eventTypeId = request.eventTypeId;
    if (request.homeId !== undefined) data.homeId = request.homeId;

    // An edit may send only one of the dates: the rule holds against the stored one.
    this.ensureEndsAfterStart(
      data.startDate ?? event.startDate,
      data.endDate === undefined ? event.endDate : data.endDate,
    );
    await this.ensureReferencesExist(data, scope);

    return (await this.repository.update(id, data)).toResponse();
  }

  async delete(id: number, scope: AccessScope): Promise<void> {
    await this.findAccessibleEvent(id, scope);
    await this.repository.softDelete(id);
  }

  private async findAccessibleEvent(id: number, scope: AccessScope): Promise<Event> {
    const event = await this.repository.findById(id);
    if (!event) throw scope.eventNotFoundError();
    scope.assertCanAccessEvent(event);
    return event;
  }

  private async ensureReferencesExist(data: UpdateEventData, scope: AccessScope): Promise<void> {
    const validations: Promise<void>[] = [];
    if (data.homeId !== undefined) {
      scope.assertCanAccessHome(data.homeId);
      validations.push(this.ensureHomeExists(data.homeId));
    }
    if (data.eventTypeId !== undefined) {
      validations.push(this.ensureEventTypeExists(data.eventTypeId));
    }
    await Promise.all(validations);
  }

  // Same shape as a zod issue, so the form marks the end field like any other error.
  private ensureEndsAfterStart(startDate: Date, endDate: Date | null): void {
    if (endDate !== null && endDate <= startDate) {
      throw HttpError.badRequest(END_NOT_AFTER_START_MESSAGE, [
        { path: ['endDate'], message: END_NOT_AFTER_START_MESSAGE },
      ]);
    }
  }

  private async ensureHomeExists(homeId: number): Promise<void> {
    if (!(await this.repository.homeExists(homeId))) {
      throw HttpError.badRequest('Casa informada não existe');
    }
  }

  private async ensureEventTypeExists(eventTypeId: number): Promise<void> {
    if (!(await this.repository.eventTypeExists(eventTypeId))) {
      throw HttpError.badRequest('Tipo de compromisso informado não existe');
    }
  }
}

export const eventService = new EventService(new PrismaEventRepository());
