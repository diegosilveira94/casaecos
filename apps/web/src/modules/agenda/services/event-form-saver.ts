import type { EventResponse } from '@casaecos/shared-types';

import {
  participantChanges,
  toEventRequest,
  type EventFormParticipant,
  type EventFormValues,
} from '../domain/event-form.js';
import { eventService, type EventService } from './event-service.js';

/**
 * The commitment itself was saved, the people linked to it were not. The form keeps
 * `eventId` so that trying again updates this commitment instead of creating another.
 */
export class EventParticipantsSaveError extends Error {
  constructor(
    readonly eventId: number,
    cause: unknown,
  ) {
    super('Event saved without its participants', { cause });
    this.name = 'EventParticipantsSaveError';
  }
}

/**
 * Saves what the form holds. The API keeps participants in their own routes, so a
 * save is the commitment first and then one call per person that changed.
 */
export class EventFormSaver {
  constructor(private readonly events: EventService) {}

  /** `eventId` null creates the commitment. */
  async save(eventId: number | null, values: EventFormValues): Promise<EventResponse> {
    const request = toEventRequest(values);
    const saved =
      eventId === null
        ? await this.events.create(request)
        : await this.events.update(eventId, request);

    try {
      await this.saveParticipants(saved, values.participants);
    } catch (error: unknown) {
      throw new EventParticipantsSaveError(saved.id, error);
    }
    return saved;
  }

  // One call at a time: the API answers each on the same event row.
  private async saveParticipants(
    saved: EventResponse,
    wanted: readonly EventFormParticipant[],
  ): Promise<void> {
    const { toAdd, toUpdate, toRemove } = participantChanges(saved.participants, wanted);

    for (const personId of toRemove) {
      await this.events.removeParticipant(saved.id, personId);
    }
    for (const { personId, participationTypeId } of toUpdate) {
      await this.events.updateParticipant(saved.id, personId, { participationTypeId });
    }
    for (const { personId, participationTypeId } of toAdd) {
      await this.events.addParticipant(saved.id, personId, { participationTypeId });
    }
  }
}

export const eventFormSaver = new EventFormSaver(eventService);
