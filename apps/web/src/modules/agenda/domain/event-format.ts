import type { EventResponse } from '@casaecos/shared-types';

import { dayKey, isSameDay } from './calendar-dates.js';

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const shortDateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const dayHeadingFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const dayLabelFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

export function formatTime(isoDate: string): string {
  return timeFormat.format(new Date(isoDate));
}

/** "09:00 – 10:00", "09:00" without an end, or the end date when it falls on another day. */
export function formatTimeRange(event: Pick<EventResponse, 'startDate' | 'endDate'>): string {
  const start = formatTime(event.startDate);
  if (event.endDate === null) return start;

  const end = new Date(event.endDate);
  const endLabel = isSameDay(new Date(event.startDate), end)
    ? timeFormat.format(end)
    : `${shortDateFormat.format(end)} ${timeFormat.format(end)}`;
  return `${start} – ${endLabel}`;
}

/** "Hoje · quarta-feira, 30 de setembro" or "Quinta-feira, 1 de outubro". */
export function formatDayHeading(day: Date, today: Date): string {
  const heading = dayHeadingFormat.format(day);
  return isSameDay(day, today) ? `Hoje · ${heading}` : capitalize(heading);
}

/** Screen-reader name of a grid day: "30 de setembro, 3 compromissos". */
export function formatDayLabel(day: Date, eventCount: number): string {
  const count =
    eventCount === 0
      ? 'nenhum compromisso'
      : `${String(eventCount)} ${eventCount === 1 ? 'compromisso' : 'compromissos'}`;
  return `${dayLabelFormat.format(day)}, ${count}`;
}

export function participantNames(event: EventResponse): string {
  return event.participants.map(({ person }) => person.name).join(', ');
}

/** Commitments by the local day they start, keeping the API order (start, then id). */
export function groupEventsByDay(events: readonly EventResponse[]): Map<string, EventResponse[]> {
  const eventsByDay = new Map<string, EventResponse[]>();

  for (const event of events) {
    const key = dayKey(new Date(event.startDate));
    const dayEvents = eventsByDay.get(key);
    if (dayEvents) dayEvents.push(event);
    else eventsByDay.set(key, [event]);
  }

  return eventsByDay;
}
