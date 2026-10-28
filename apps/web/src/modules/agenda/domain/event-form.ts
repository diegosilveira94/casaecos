import type {
  CheckEventConflictsRequest,
  CreateEventRequest,
  EventParticipantResponse,
  EventResponse,
  PersonResponse,
} from '@casaecos/shared-types';

import { dayKey, isSameDay, toOffsetIsoString } from './calendar-dates.js';

// Column sizes of `event` (schema.prisma), which the API also validates.
export const EVENT_TITLE_MAX_LENGTH = 45;
export const EVENT_ADDRESS_MAX_LENGTH = 100;
export const EVENT_DESCRIPTION_MAX_LENGTH = 300;

// Lookup ids are fixed by the seed (#37).
const SHELTERED_ROLE_ID = 5;
export const DRIVER_ROLE_ID = 4;

/** `participation_type`: the role of a person in one commitment. */
export const PARTICIPATION_TYPE_IDS = { participant: 2, responsible: 3, driver: 4 } as const;

export interface EventFormParticipant {
  personId: number;
  name: string;
  participationTypeId: number;
}

/**
 * The commitment as the form holds it. Day and time are the values of the native
 * inputs (`YYYY-MM-DD`, `HH:MM`), in the device time zone; an empty string is a
 * field left blank.
 */
export interface EventFormValues {
  title: string;
  eventTypeId: number | null;
  homeId: number | null;
  startDay: string;
  startTime: string;
  endTime: string;
  endsOnAnotherDay: boolean;
  /** Only read when `endsOnAnotherDay`. */
  endDay: string;
  address: string;
  description: string;
  participants: EventFormParticipant[];
}

export type EventFormField =
  'title' | 'eventTypeId' | 'startDay' | 'startTime' | 'endDay' | 'endTime' | 'homeId';

export type EventFormErrors = Partial<Record<EventFormField, string>>;

export interface ParticipantChanges {
  toAdd: EventFormParticipant[];
  toUpdate: EventFormParticipant[];
  toRemove: number[];
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function timeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateTime(day: string, time: string): Date {
  return new Date(`${day}T${time}:00`);
}

function endDayOf(values: EventFormValues): string {
  return values.endsOnAnotherDay ? values.endDay : values.startDay;
}

export function emptyEventForm(day: Date, homeId: number | null): EventFormValues {
  return {
    title: '',
    eventTypeId: null,
    homeId,
    startDay: dayKey(day),
    startTime: '',
    endTime: '',
    endsOnAnotherDay: false,
    endDay: '',
    address: '',
    description: '',
    participants: [],
  };
}

export function eventFormFrom(event: EventResponse): EventFormValues {
  const start = new Date(event.startDate);
  const end = event.endDate === null ? null : new Date(event.endDate);
  const endsOnAnotherDay = end !== null && !isSameDay(start, end);

  return {
    title: event.title,
    eventTypeId: event.eventType.id,
    homeId: event.home.id,
    startDay: dayKey(start),
    startTime: timeInputValue(start),
    endTime: end === null ? '' : timeInputValue(end),
    endsOnAnotherDay,
    endDay: end !== null && endsOnAnotherDay ? dayKey(end) : '',
    address: event.address ?? '',
    description: event.description ?? '',
    participants: event.participants.map(({ person, participationType }) => ({
      personId: person.id,
      name: person.name,
      participationTypeId: participationType.id,
    })),
  };
}

export function validateEventForm(values: EventFormValues): EventFormErrors {
  const errors: EventFormErrors = {};

  if (values.title.trim() === '') errors.title = 'Informe o título.';
  if (values.eventTypeId === null) errors.eventTypeId = 'Escolha o tipo de compromisso.';
  if (values.startDay === '') errors.startDay = 'Informe a data.';
  if (values.startTime === '') errors.startTime = 'Informe o horário.';
  if (values.homeId === null) errors.homeId = 'Escolha a casa.';

  if (values.endsOnAnotherDay) {
    if (values.endDay === '') errors.endDay = 'Informe a data de término.';
    else if (values.endTime === '') errors.endTime = 'Informe o horário.';
  }

  const endDay = endDayOf(values);
  const hasStart = values.startDay !== '' && values.startTime !== '';
  const hasEnd = endDay !== '' && values.endTime !== '';
  if (
    hasStart &&
    hasEnd &&
    localDateTime(endDay, values.endTime) <= localDateTime(values.startDay, values.startTime)
  ) {
    errors[values.endsOnAnotherDay ? 'endDay' : 'endTime'] = 'O término deve ser depois do início.';
  }

  return errors;
}

export function hasEventFormChanges(initial: EventFormValues, current: EventFormValues): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current);
}

/** Body of the create and of the update. Call only with values that passed the validation. */
export function toEventRequest(values: EventFormValues): CreateEventRequest {
  if (values.eventTypeId === null || values.homeId === null) {
    throw new Error('Event form converted to a request before being validated');
  }

  return {
    title: values.title.trim(),
    eventTypeId: values.eventTypeId,
    homeId: values.homeId,
    startDate: toOffsetIsoString(localDateTime(values.startDay, values.startTime)),
    endDate:
      values.endTime === ''
        ? null
        : toOffsetIsoString(localDateTime(endDayOf(values), values.endTime)),
    address: values.address.trim() || null,
    description: values.description.trim() || null,
  };
}

/** The interval and people checked before the event itself is persisted. */
export function toEventConflictRequest(
  values: EventFormValues,
  excludedEventId: number | null,
): CheckEventConflictsRequest {
  const request = toEventRequest(values);
  return {
    startDate: request.startDate,
    endDate: request.endDate ?? null,
    participantIds: values.participants.map(({ personId }) => personId),
    ...(excludedEventId === null ? {} : { excludedEventId }),
  };
}

/** What to send to the participant routes so the saved commitment matches the form. */
export function participantChanges(
  saved: readonly EventParticipantResponse[],
  wanted: readonly EventFormParticipant[],
): ParticipantChanges {
  const savedTypeByPersonId = new Map(
    saved.map(({ person, participationType }) => [person.id, participationType.id]),
  );
  const wantedPersonIds = new Set(wanted.map(({ personId }) => personId));

  return {
    toAdd: wanted.filter(({ personId }) => !savedTypeByPersonId.has(personId)),
    toUpdate: wanted.filter(({ personId, participationTypeId }) => {
      const savedTypeId = savedTypeByPersonId.get(personId);
      return savedTypeId !== undefined && savedTypeId !== participationTypeId;
    }),
    toRemove: saved
      .map(({ person }) => person.id)
      .filter((personId) => !wantedPersonIds.has(personId)),
  };
}

export function isSheltered(person: PersonResponse): boolean {
  return person.role.id === SHELTERED_ROLE_ID;
}

export function isDriver(person: PersonResponse): boolean {
  return person.role.id === DRIVER_ROLE_ID;
}

/**
 * Who leaves the commitment when its home changes: the people of the old home that
 * the new one does not have. Anyone linked to neither stays, since no field of the
 * form would show them as lost.
 */
export function participantsLeftBehind(
  participants: readonly EventFormParticipant[],
  oldHomePeople: readonly PersonResponse[],
  newHomePeople: readonly PersonResponse[],
): EventFormParticipant[] {
  const oldHomeIds = new Set(oldHomePeople.map(({ id }) => id));
  const newHomeIds = new Set(newHomePeople.map(({ id }) => id));
  return participants.filter(
    ({ personId }) => oldHomeIds.has(personId) && !newHomeIds.has(personId),
  );
}
