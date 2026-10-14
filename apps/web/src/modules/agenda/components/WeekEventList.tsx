import type { EventResponse } from '@casaecos/shared-types';

import { dayKey } from '../domain/calendar-dates.js';
import { formatDayHeading } from '../domain/event-format.js';
import type { AgendaEvents } from '../hooks/use-agenda-events.js';
import { EventCardList } from './EventCardList.js';
import { MonthLoadError } from './MonthLoadError.js';

interface WeekEventListProps {
  days: Date[];
  today: Date;
  eventsByDay: ReadonlyMap<string, EventResponse[]>;
  agendaEvents: AgendaEvents;
  onRetry: () => void;
  onOpenEvent: (event: EventResponse) => void;
}

export function WeekEventList({
  days,
  today,
  eventsByDay,
  agendaEvents,
  onRetry,
  onOpenEvent,
}: WeekEventListProps): React.JSX.Element {
  if (agendaEvents.status === 'loading') {
    return (
      <p className="day-events__status" role="status">
        <span className="spinner spinner--primary spinner--small" aria-hidden="true" />
        Carregando compromissos...
      </p>
    );
  }

  if (agendaEvents.status === 'failed') {
    return <MonthLoadError message={agendaEvents.message} onRetry={onRetry} />;
  }

  const daysWithEvents = days.filter((day) => (eventsByDay.get(dayKey(day))?.length ?? 0) > 0);
  if (daysWithEvents.length === 0) {
    return <p className="day-events__status">Nenhum compromisso nesta semana.</p>;
  }

  return (
    <section className="week-event-list" aria-label="Compromissos da semana">
      {daysWithEvents.map((day) => {
        const events = eventsByDay.get(dayKey(day)) ?? [];
        return (
          <section className="day-events week-event-list__day" key={dayKey(day)}>
            <header className="day-events__header">
              <h3>{formatDayHeading(day, today)}</h3>
              <span>
                {events.length} {events.length === 1 ? 'compromisso' : 'compromissos'}
              </span>
            </header>
            <EventCardList events={events} onOpenEvent={onOpenEvent} />
          </section>
        );
      })}
    </section>
  );
}
