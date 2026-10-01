import type { EventResponse } from '@casaecos/shared-types';

import { Dialog } from '../../../shared/ui/Dialog.js';
import { formatDayHeading, formatTimeRange } from '../domain/event-format.js';
import { eventToneClassName } from '../domain/event-tone.js';

interface EventDetailsDialogProps {
  event: EventResponse;
  today: Date;
  onClose: () => void;
}

/** Read-only view of a commitment. Editing and removing are ECOS-9. */
export function EventDetailsDialog({
  event,
  today,
  onClose,
}: EventDetailsDialogProps): React.JSX.Element {
  return (
    <Dialog
      title={event.title}
      eyebrow={<span className="event-details__type">{event.eventType.name}</span>}
      className={eventToneClassName(event.eventType.id)}
      onClose={onClose}
    >
      <dl className="event-details">
        <div>
          <dt>Quando</dt>
          <dd>
            {formatDayHeading(new Date(event.startDate), today)} · {formatTimeRange(event)}
          </dd>
        </div>
        <div>
          <dt>Casa</dt>
          <dd>{event.home.name}</dd>
        </div>
        {event.address ? (
          <div>
            <dt>Endereço</dt>
            <dd>{event.address}</dd>
          </div>
        ) : null}
        {event.description ? (
          <div>
            <dt>Descrição</dt>
            <dd className="event-details__description">{event.description}</dd>
          </div>
        ) : null}
        <div>
          <dt>Participantes</dt>
          <dd>
            {event.participants.length === 0 ? (
              'Nenhum participante'
            ) : (
              <ul className="event-details__participants">
                {event.participants.map(({ person, participationType }) => (
                  <li key={person.id}>
                    {person.name} <span>· {participationType.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </Dialog>
  );
}
