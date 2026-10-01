import type { HomeSummaryResponse } from './home.js';
import type { PersonSummaryResponse } from './person.js';

export interface EventTypeResponse {
  id: number;
  name: string;
}

export interface ParticipationTypeResponse {
  id: number;
  description: string;
}

/** Someone taking part in a commitment and in which role (organizer, driver...). */
export interface EventParticipantResponse {
  person: PersonSummaryResponse;
  participationType: ParticipationTypeResponse;
}

/**
 * A commitment in the agenda. Dates are ISO 8601 strings with an offset; `endDate`
 * is null when the commitment has no set end time.
 */
export interface EventResponse {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  address: string | null;
  eventType: EventTypeResponse;
  home: HomeSummaryResponse;
  /** Ordered by the person's name. */
  participants: EventParticipantResponse[];
  createdAt: string;
  updatedAt: string;
}

/** `startDate` and `endDate` must carry an offset (`Z` or `-03:00`): the API rejects local times. */
export interface CreateEventRequest {
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  address?: string | null;
  eventTypeId: number;
  homeId: number;
}

/**
 * Filters of `GET /agenda/events`, sent as a query string. A commitment is in the
 * period when `from <= startDate < to`; both carry an offset, like the event dates.
 * `personId` keeps the commitments that person takes part in. `pageSize` goes up
 * to 200 (default 50). The result is also cut by the user's access scope, so a
 * `homeId` or `personId` outside it yields an empty page, not an error.
 */
export interface ListEventsQuery {
  homeId?: number;
  personId?: number;
  eventTypeId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string | null;
  address?: string | null;
  eventTypeId?: number;
  homeId?: number;
}

/** Body of `POST`, `PUT` and `PATCH /agenda/events/:id/participants/:personId`. */
export interface EventParticipantRequest {
  participationTypeId: number;
}
