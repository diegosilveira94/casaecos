import type { EventResponse } from '@casaecos/shared-types';

import { dayKey, isSameDay } from '../domain/calendar-dates.js';
import type { CalendarMonth } from '../domain/calendar-month.js';
import { eventSubject, formatDayLabel, formatTime } from '../domain/event-format.js';
import { eventToneClassName } from '../domain/event-tone.js';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_DOTS_PER_DAY = 3;
// One block per day, like the prototype; the rest goes behind "+N compromissos".
const MAX_BLOCKS_PER_DAY = 1;

interface MonthGridProps {
  month: CalendarMonth;
  today: Date;
  selectedDay: Date;
  eventsByDay: ReadonlyMap<string, EventResponse[]>;
  isLoading: boolean;
  onSelectDay: (day: Date) => void;
  onOpenEvent: (event: EventResponse) => void;
}

interface DayCellProps {
  day: Date;
  events: EventResponse[];
  isOutside: boolean;
  isSelected: boolean;
  isToday: boolean;
  onSelectDay: (day: Date) => void;
  onOpenEvent: (event: EventResponse) => void;
}

function cellClassName(isOutside: boolean, isSelected: boolean, isToday: boolean): string {
  return [
    'month-grid__day',
    isOutside ? 'is-outside' : '',
    isSelected ? 'is-selected' : '',
    isToday ? 'is-today' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Phone: the number (with dots) picks the day. Desktop: blocks open the commitment. */
function DayCell({
  day,
  events,
  isOutside,
  isSelected,
  isToday,
  onSelectDay,
  onOpenEvent,
}: DayCellProps): React.JSX.Element {
  const blocks = events.slice(0, MAX_BLOCKS_PER_DAY);
  const hiddenCount = events.length - blocks.length;

  return (
    <div className={cellClassName(isOutside, isSelected, isToday)}>
      <button
        className="month-grid__number"
        type="button"
        disabled={isOutside}
        aria-pressed={isSelected}
        aria-label={isOutside ? undefined : formatDayLabel(day, events.length)}
        onClick={() => {
          onSelectDay(day);
        }}
      >
        <span>{day.getDate()}</span>
        {events.length > 0 ? (
          <span className="month-grid__dots" aria-hidden="true">
            {events.slice(0, MAX_DOTS_PER_DAY).map((event) => (
              <span
                key={event.id}
                className={`month-grid__dot ${eventToneClassName(event.eventType.id)}`}
              />
            ))}
          </span>
        ) : null}
      </button>

      {blocks.map((event) => (
        <button
          key={event.id}
          className={`month-grid__block ${eventToneClassName(event.eventType.id)}`}
          type="button"
          onClick={() => {
            onOpenEvent(event);
          }}
        >
          <span>{formatTime(event.startDate)}</span>
          <strong>{event.title}</strong>
          <span>{eventSubject(event)}</span>
        </button>
      ))}
      {hiddenCount > 0 ? (
        <button
          className="month-grid__more"
          type="button"
          onClick={() => {
            onSelectDay(day);
          }}
        >
          +{hiddenCount} {hiddenCount === 1 ? 'compromisso' : 'compromissos'}
        </button>
      ) : null}
    </div>
  );
}

export function MonthGrid({
  month,
  today,
  selectedDay,
  eventsByDay,
  isLoading,
  onSelectDay,
  onOpenEvent,
}: MonthGridProps): React.JSX.Element {
  return (
    <div className="month-grid" aria-busy={isLoading}>
      <div className="month-grid__weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="month-grid__weeks" role="group" aria-label={`Dias de ${month.label}`}>
        {month.weeks().map((week) => (
          <div key={dayKey(week[0] ?? month.firstDay)} className="month-grid__week">
            {week.map((day) => {
              const isOutside = !month.contains(day);
              return (
                <DayCell
                  key={dayKey(day)}
                  day={day}
                  events={isOutside ? [] : (eventsByDay.get(dayKey(day)) ?? [])}
                  isOutside={isOutside}
                  isSelected={!isOutside && isSameDay(day, selectedDay)}
                  isToday={isSameDay(day, today)}
                  onSelectDay={onSelectDay}
                  onOpenEvent={onOpenEvent}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
