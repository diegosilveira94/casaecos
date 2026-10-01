import type { EventResponse } from '@casaecos/shared-types';

import { formatDayHeading } from '../domain/event-format.js';
import type { MonthEvents } from '../hooks/use-month-events.js';
import { EventCardList } from './EventCardList.js';
import { MonthLoadError } from './MonthLoadError.js';

interface DayEventsProps {
  day: Date;
  today: Date;
  monthEvents: MonthEvents;
  dayEvents: EventResponse[];
  onRetry: () => void;
  onOpenEvent: (event: EventResponse) => void;
}

function eventCountLabel(count: number): string {
  return `${String(count)} ${count === 1 ? 'compromisso' : 'compromissos'}`;
}

function DayEventsBody({
  monthEvents,
  dayEvents,
  onRetry,
  onOpenEvent,
}: Omit<DayEventsProps, 'day' | 'today'>): React.JSX.Element {
  if (monthEvents.status === 'loading') {
    return (
      <p className="day-events__status" role="status">
        <span className="spinner spinner--primary spinner--small" aria-hidden="true" />
        Carregando compromissos...
      </p>
    );
  }

  if (monthEvents.status === 'failed') {
    return <MonthLoadError message={monthEvents.message} onRetry={onRetry} />;
  }

  return <EventCardList events={dayEvents} onOpenEvent={onOpenEvent} />;
}

export function DayEvents({ day, today, ...body }: DayEventsProps): React.JSX.Element {
  const heading = formatDayHeading(day, today);

  return (
    <section className="day-events" aria-label={`Compromissos do dia: ${heading}`}>
      <header className="day-events__header">
        <h2>{heading}</h2>
        {body.monthEvents.status === 'loaded' && body.dayEvents.length > 0 ? (
          <span>{eventCountLabel(body.dayEvents.length)}</span>
        ) : null}
      </header>
      <DayEventsBody {...body} />
    </section>
  );
}
