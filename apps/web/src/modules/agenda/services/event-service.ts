import type {
  ApiMessage,
  CreateEventRequest,
  EventResponse,
  UpdateEventRequest,
} from '@casaecos/shared-types';

import { apiClient } from '../../../shared/http/api-client.js';
import type { HttpClient } from '../../../shared/http/http-client.js';

const EVENTS_PATH = '/agenda/events';

export class EventService {
  constructor(private readonly http: HttpClient) {}

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
