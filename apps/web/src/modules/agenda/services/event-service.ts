import type {
  ApiMessage,
  CreateEventRequest,
  EventParticipantRequest,
  EventResponse,
  EventTypeResponse,
  ListEventsQuery,
  Paginated,
  ParticipationTypeResponse,
  UpdateEventRequest,
} from '@casaecos/shared-types';

import { apiClient } from '../../../shared/http/api-client.js';
import type { HttpClient } from '../../../shared/http/http-client.js';

const EVENTS_PATH = '/agenda/events';
const EVENT_TYPES_PATH = '/agenda/event-types';
const PARTICIPATION_TYPES_PATH = '/agenda/participation-types';
// The API maximum (`src/shared/pagination.ts`): a month of the agenda fits in one page.
const MAX_PAGE_SIZE = 200;

export type ListAllEventsQuery = Omit<ListEventsQuery, 'page' | 'pageSize'>;

function eventPath(id: number): string {
  return `${EVENTS_PATH}/${String(id)}`;
}

function participantPath(eventId: number, personId: number): string {
  return `${eventPath(eventId)}/participants/${String(personId)}`;
}

function toQueryString(query: ListEventsQuery): string {
  const params = new URLSearchParams(
    Object.entries(query).map(([name, value]) => [name, String(value)]),
  );
  return params.size === 0 ? '' : `?${params.toString()}`;
}

export class EventService {
  constructor(private readonly http: HttpClient) {}

  list(query: ListEventsQuery = {}): Promise<Paginated<EventResponse>> {
    return this.http.get(`${EVENTS_PATH}${toQueryString(query)}`);
  }

  /** Every page of the listing, in order. A month rarely goes past the first one. */
  async listAll(query: ListAllEventsQuery = {}): Promise<EventResponse[]> {
    const events: EventResponse[] = [];

    for (let page = 1; ; page += 1) {
      const { items, total } = await this.list({ ...query, page, pageSize: MAX_PAGE_SIZE });
      events.push(...items);
      if (items.length === 0 || events.length >= total) return events;
    }
  }

  listEventTypes(): Promise<EventTypeResponse[]> {
    return this.http.get(EVENT_TYPES_PATH);
  }

  listParticipationTypes(): Promise<ParticipationTypeResponse[]> {
    return this.http.get(PARTICIPATION_TYPES_PATH);
  }

  getById(id: number): Promise<EventResponse> {
    return this.http.get(eventPath(id));
  }

  create(request: CreateEventRequest): Promise<EventResponse> {
    return this.http.post(EVENTS_PATH, request);
  }

  update(id: number, request: UpdateEventRequest): Promise<EventResponse> {
    return this.http.patch(eventPath(id), request);
  }

  delete(id: number): Promise<ApiMessage> {
    return this.http.delete(eventPath(id));
  }

  addParticipant(
    eventId: number,
    personId: number,
    request: EventParticipantRequest,
  ): Promise<ApiMessage> {
    return this.http.post(participantPath(eventId, personId), request);
  }

  updateParticipant(
    eventId: number,
    personId: number,
    request: EventParticipantRequest,
  ): Promise<ApiMessage> {
    return this.http.patch(participantPath(eventId, personId), request);
  }

  removeParticipant(eventId: number, personId: number): Promise<ApiMessage> {
    return this.http.delete(participantPath(eventId, personId));
  }
}

export const eventService = new EventService(apiClient);
