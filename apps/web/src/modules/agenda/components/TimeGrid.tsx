import type { CSSProperties } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { dayKey, isSameDay } from '../domain/calendar-dates.js';
import { eventSubject, formatTimeRange } from '../domain/event-format.js';
import { eventToneClassName } from '../domain/event-tone.js';

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 20;
const HOUR_HEIGHT = 64;
const MIN_EVENT_HEIGHT = 34;

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

interface TimeGridProps {
  days: Date[];
  today: Date;
  eventsByDay: ReadonlyMap<string, EventResponse[]>;
  isLoading: boolean;
  hasError: boolean;
  label: string;
  onOpenEvent: (event: EventResponse) => void;
  onShowDay?: (day: Date) => void;
}

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function eventEndMinutes(event: EventResponse, start: Date): number {
  if (event.endDate === null) return Math.min(24 * 60, minutesOf(start) + 60);

  const end = new Date(event.endDate);
  return isSameDay(start, end) ? minutesOf(end) : 24 * 60;
}

function visibleHours(events: EventResponse[]): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  for (const event of events) {
    const start = new Date(event.startDate);
    startHour = Math.min(startHour, start.getHours());
    endHour = Math.max(endHour, Math.ceil(eventEndMinutes(event, start) / 60));
  }

  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

function eventStyle(event: EventResponse, startHour: number, endHour: number): CSSProperties {
  const start = new Date(event.startDate);
  const startMinutes = minutesOf(start);
  const top = ((startMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
  const visibleEnd = Math.min(eventEndMinutes(event, start), endHour * 60);
  const durationMinutes = Math.max(30, visibleEnd - startMinutes);

  return {
    top: `${String(top)}px`,
    height: `${String(Math.max(MIN_EVENT_HEIGHT, (durationMinutes / 60) * HOUR_HEIGHT))}px`,
  };
}

export function TimeGrid({
  days,
  today,
  eventsByDay,
  isLoading,
  hasError,
  label,
  onOpenEvent,
  onShowDay,
}: TimeGridProps): React.JSX.Element {
  const events = days.flatMap((day) => eventsByDay.get(dayKey(day)) ?? []);
  const { startHour, endHour } = visibleHours(events);
  const hourCount = endHour - startHour;
  const hours = Array.from({ length: hourCount + 1 }, (_, offset) => startHour + offset);
  const style = {
    '--time-grid-days': String(days.length),
    '--time-grid-hours': String(hourCount),
    '--time-grid-height': `${String(hourCount * HOUR_HEIGHT)}px`,
  } as CSSProperties;

  return (
    <div
      className={`time-grid ${days.length === 1 ? 'time-grid--day' : 'time-grid--week'}`}
      aria-busy={isLoading}
    >
      <div className="time-grid__scroll" role="group" aria-label={label}>
        <div className="time-grid__header" style={style}>
          <span aria-hidden="true" />
          {days.map((day) => {
            const className = `time-grid__day-heading${isSameDay(day, today) ? ' is-today' : ''}`;
            const content = (
              <>
                <span>{weekdayFormat.format(day).replace('.', '')}</span>
                <strong>{day.getDate()}</strong>
              </>
            );

            return onShowDay ? (
              <button
                className={className}
                key={dayKey(day)}
                type="button"
                aria-label={`Ver dia ${String(day.getDate())}`}
                onClick={() => {
                  onShowDay(day);
                }}
              >
                {content}
              </button>
            ) : (
              <div className={className} key={dayKey(day)}>
                {content}
              </div>
            );
          })}
        </div>

        <div className="time-grid__body" style={style}>
          <div className="time-grid__hours" aria-hidden="true">
            {hours.map((hour) => (
              <span key={hour} style={{ top: `${String((hour - startHour) * HOUR_HEIGHT)}px` }}>
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          <div className="time-grid__columns">
            {days.map((day) => (
              <div className="time-grid__day" key={dayKey(day)}>
                {hours.slice(0, -1).map((hour) => (
                  <span className="time-grid__hour-line" key={hour} aria-hidden="true" />
                ))}
                {(eventsByDay.get(dayKey(day)) ?? []).map((event) => (
                  <button
                    className={`time-grid__event ${eventToneClassName(event.eventType.id)}`}
                    key={event.id}
                    type="button"
                    style={eventStyle(event, startHour, endHour)}
                    onClick={() => {
                      onOpenEvent(event);
                    }}
                  >
                    <span>{formatTimeRange(event)}</span>
                    <strong>{event.title}</strong>
                    <small>{eventSubject(event)}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {isLoading ? (
        <p className="time-grid__empty" role="status">
          <span className="spinner spinner--primary spinner--small" aria-hidden="true" />
          Carregando compromissos...
        </p>
      ) : events.length === 0 && !hasError ? (
        <p className="time-grid__empty">Nenhum compromisso neste período.</p>
      ) : null}
    </div>
  );
}
