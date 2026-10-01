import type { EventResponse } from '@casaecos/shared-types';

import { EventCard } from './EventCard.js';

interface EventCardListProps {
  events: EventResponse[];
  onOpenEvent: (event: EventResponse) => void;
}

export function EventCardList({ events, onOpenEvent }: EventCardListProps): React.JSX.Element {
  if (events.length === 0) {
    return <p className="day-events__status">Nenhum compromisso neste dia.</p>;
  }

  return (
    <ul className="day-events__list">
      {events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} onOpen={onOpenEvent} />
        </li>
      ))}
    </ul>
  );
}
