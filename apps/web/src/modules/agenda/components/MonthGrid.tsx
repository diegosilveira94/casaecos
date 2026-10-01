import type { EventResponse } from '@casaecos/shared-types';

import { dayKey, isSameDay } from '../domain/calendar-dates.js';
import type { CalendarMonth } from '../domain/calendar-month.js';
import { formatDayLabel, formatTime } from '../domain/event-format.js';
import { eventToneClassName } from '../domain/event-tone.js';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Dots on the phone, chips on the desktop grid: past this the day shows "+N".
const MAX_MARKS_PER_DAY = 3;

interface MonthGridProps {
  month: CalendarMonth;
  today: Date;
  selectedDay: Date;
  eventsByDay: ReadonlyMap<string, EventResponse[]>;
  isLoading: boolean;
  onSelectDay: (day: Date) => void;
}

function DayMarks({ events }: { events: EventResponse[] }): React.JSX.Element | null {
  if (events.length === 0) return null;

  const shown = events.slice(0, MAX_MARKS_PER_DAY);
  const hiddenCount = events.length - shown.length;

  // The day button's label already names the count: the marks are only visual.
  return (
    <span className="month-grid__marks" aria-hidden="true">
      <span className="month-grid__dots">
        {shown.map((event) => (
          <span
            key={event.id}
            className={`month-grid__dot ${eventToneClassName(event.eventType.id)}`}
          />
        ))}
      </span>
      <span className="month-grid__chips">
        {shown.map((event) => (
          <span
            key={event.id}
            className={`month-grid__chip ${eventToneClassName(event.eventType.id)}`}
          >
            {formatTime(event.startDate)} {event.title}
          </span>
        ))}
        {hiddenCount > 0 ? (
          <span className="month-grid__more">+{hiddenCount} compromissos</span>
        ) : null}
      </span>
    </span>
  );
}

function dayClassName(isOutside: boolean, isSelected: boolean, isToday: boolean): string {
  return [
    'month-grid__day',
    isOutside ? 'is-outside' : '',
    isSelected ? 'is-selected' : '',
    isToday ? 'is-today' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function MonthGrid({
  month,
  today,
  selectedDay,
  eventsByDay,
  isLoading,
  onSelectDay,
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
              const isSelected = !isOutside && isSameDay(day, selectedDay);
              const events = isOutside ? [] : (eventsByDay.get(dayKey(day)) ?? []);

              return (
                <button
                  key={dayKey(day)}
                  className={dayClassName(isOutside, isSelected, isSameDay(day, today))}
                  type="button"
                  disabled={isOutside}
                  aria-pressed={isSelected}
                  aria-label={isOutside ? undefined : formatDayLabel(day, events.length)}
                  onClick={() => {
                    onSelectDay(day);
                  }}
                >
                  <span className="month-grid__number">{day.getDate()}</span>
                  <DayMarks events={events} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
