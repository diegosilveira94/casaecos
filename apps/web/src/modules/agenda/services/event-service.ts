import type {
  ApiMessage,
  CreateEventRequest,
  EventResponse,
  EventTypeResponse,
  ListEventsQuery,
  Paginated,
  UpdateEventRequest,
} from '@casaecos/shared-types';

import { apiClient } from '../../../shared/http/api-client.js';
import type { HttpClient } from '../../../shared/http/http-client.js';

const EVENTS_PATH = '/agenda/events';
const EVENT_TYPES_PATH = '/agenda/event-types';

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

  listEventTypes(): Promise<EventTypeResponse[]> {
    return this.http.get(EVENT_TYPES_PATH);
  }

  getById(id: number): Promise<EventResponse> {
    return this.http.get(`${EVENTS_PATH}/${String(id)}`);
  }

  create(request: CreateEventRequest): Promise<EventResponse> {
    return this.http.post(EVENTS_PATH, request);
  }

  update(id: number, request: UpdateEventRequest): Promise<EventResponse> {
    return this.http.patch(`${EVENTS_PATH}/${String(id)}`, request);
  }

  delete(id: number): Promise<ApiMessage> {
    return this.http.delete(`${EVENTS_PATH}/${String(id)}`);
  }
}

export const eventService = new EventService(apiClient);
