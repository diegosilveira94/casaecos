import type { EventResponse } from '@casaecos/shared-types';

import { formatTimeRange, participantNames } from '../domain/event-format.js';
import { eventToneClassName } from '../domain/event-tone.js';

interface EventCardProps {
  event: EventResponse;
  onOpen: (event: EventResponse) => void;
}

export function EventCard({ event, onOpen }: EventCardProps): React.JSX.Element {
  const names = participantNames(event);

  return (
    <button
      className={`event-card ${eventToneClassName(event.eventType.id)}`}
      type="button"
      onClick={() => {
        onOpen(event);
      }}
    >
      <span className="event-card__top">
        <span className="event-card__time">{formatTimeRange(event)}</span>
        <span className="event-card__type">{event.eventType.name}</span>
      </span>
      <strong className="event-card__title">{event.title}</strong>
      <span className="event-card__home">{event.home.name}</span>
      {names ? <span className="event-card__people">{names}</span> : null}
    </button>
  );
}
