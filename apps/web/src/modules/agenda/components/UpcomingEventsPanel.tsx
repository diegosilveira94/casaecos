import type { EventResponse } from '@casaecos/shared-types';

import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import { CalendarIcon, ClockIcon } from '../../../shared/ui/icons.js';
import { eventSubject, formatDate, formatTime } from '../domain/event-format.js';
import { eventToneClassName } from '../domain/event-tone.js';
import type { UpcomingEvents } from '../hooks/use-upcoming-events.js';
import { EventTypeIcon } from './EventTypeIcon.js';

interface UpcomingEventsPanelProps {
  upcomingEvents: UpcomingEvents;
  onOpenEvent: (event: EventResponse) => void;
}

function UpcomingList({
  upcomingEvents,
  onOpenEvent,
}: UpcomingEventsPanelProps): React.JSX.Element {
  if (upcomingEvents.status === 'loading') {
    return <p className="upcoming-events__status">Carregando...</p>;
  }
  if (upcomingEvents.status === 'failed') {
    return <p className="upcoming-events__status">Não foi possível carregar.</p>;
  }
  if (upcomingEvents.events.length === 0) {
    return <p className="upcoming-events__status">Nenhum compromisso pela frente.</p>;
  }

  return (
    <ul className="upcoming-events__list">
      {upcomingEvents.events.map((event) => (
        <li key={event.id}>
          <button
            className={`upcoming-event ${eventToneClassName(event.eventType.id)}`}
            type="button"
            onClick={() => {
              onOpenEvent(event);
            }}
          >
            <EventTypeIcon eventTypeId={event.eventType.id} />
            <span className="upcoming-event__body">
              <strong>{event.title}</strong>
              <strong>{eventSubject(event)}</strong>
              <span className="upcoming-event__meta">
                <CalendarIcon />
                {formatDate(event.startDate)}
              </span>
              <span className="upcoming-event__meta">
                <ClockIcon />
                {formatTime(event.startDate)}
              </span>
              <span className="upcoming-event__home">{event.home.name}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function UpcomingEventsPanel(props: UpcomingEventsPanelProps): React.JSX.Element {
  return (
    <section className="upcoming-events" aria-labelledby="upcoming-events-title">
      <h2 id="upcoming-events-title">Próximos compromissos</h2>
      <UpcomingList {...props} />
      <button className="upcoming-events__all" {...COMING_SOON_PROPS}>
        Ver todos
      </button>
    </section>
  );
}
