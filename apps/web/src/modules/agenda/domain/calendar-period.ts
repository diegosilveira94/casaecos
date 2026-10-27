import { addDays, startOfDay, toOffsetIsoString } from './calendar-dates.js';
import type { CalendarPeriod } from './calendar-month.js';

export type AgendaView = 'month' | 'week' | 'day';

const longDayFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
});
const shortDayWithYearFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function capitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** Sunday, matching the month grid used by the agenda. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  return addDays(day, -day.getDay());
}

export function daysOfWeek(date: Date): Date[] {
  const firstDay = startOfWeek(date);
  return Array.from({ length: 7 }, (_, offset) => addDays(firstDay, offset));
}

/** Half-open period used by `GET /agenda/events`. */
export function periodFor(view: Exclude<AgendaView, 'month'>, date: Date): CalendarPeriod {
  const fromDate = view === 'week' ? startOfWeek(date) : startOfDay(date);
  const toDate = addDays(fromDate, view === 'week' ? 7 : 1);
  return { from: toOffsetIsoString(fromDate), to: toOffsetIsoString(toDate) };
}

export function dayViewLabel(date: Date): string {
  return capitalize(longDayFormat.format(date));
}

export function weekViewLabel(date: Date): string {
  const days = daysOfWeek(date);
  const first = days[0] ?? date;
  const last = days[6] ?? date;

  if (first.getFullYear() !== last.getFullYear()) {
    return `${shortDayWithYearFormat.format(first)} – ${shortDayWithYearFormat.format(last)}`;
  }

  return `${shortDayFormat.format(first)} – ${shortDayWithYearFormat.format(last)}`;
}

export function moveVisibleDate(view: AgendaView, date: Date, direction: -1 | 1): Date {
  if (view === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + direction, 1);
  }

  return addDays(date, direction * (view === 'week' ? 7 : 1));
}
