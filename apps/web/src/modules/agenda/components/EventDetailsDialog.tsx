import type { EventResponse } from '@casaecos/shared-types';

import { Dialog } from '../../../shared/ui/Dialog.js';
import { formatDayHeading, formatTimeRange } from '../domain/event-format.js';
import { eventToneClassName } from '../domain/event-tone.js';

interface EventDetailsDialogProps {
  event: EventResponse;
  today: Date;
  /** Absent for who cannot change commitments (`event:write`): no "Editar" then. */
  onEdit?: (() => void) | undefined;
  onClose: () => void;
}

/** Read-only view of a commitment; "Editar" leads to the form, which also deletes. */
export function EventDetailsDialog({
  event,
  today,
  onEdit,
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
          <dt>Envolvidos</dt>
          <dd>
            {event.participants.length === 0 ? (
              'Nenhuma pessoa envolvida'
            ) : (
              <ul className="event-details__tags">
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
      {onEdit ? (
        <div className="event-details__actions">
          <button className="outline-button" type="button" onClick={onEdit}>
            Editar
          </button>
        </div>
      ) : null}
    </Dialog>
  );
}
