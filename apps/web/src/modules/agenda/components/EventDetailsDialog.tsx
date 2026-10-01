import { useEffect, useId, useRef } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { formatDayHeading, formatTimeRange } from '../domain/event-format.js';
import { eventToneClassName } from '../domain/event-tone.js';

interface EventDetailsDialogProps {
  event: EventResponse;
  today: Date;
  onClose: () => void;
}

/** Read-only view of a commitment: bottom sheet on the phone, centered on the desktop. */
export function EventDetailsDialog({
  event,
  today,
  onClose,
}: EventDetailsDialogProps): React.JSX.Element {
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);

  // Focus moves into the dialog and goes back to the card that opened it.
  useEffect(() => {
    const openedFrom =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const closeOnEscape = (keyboardEvent: KeyboardEvent): void => {
      if (keyboardEvent.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      openedFrom?.focus();
    };
  }, [onClose]);

  const startDay = new Date(event.startDate);

  return (
    <div className="event-dialog">
      <div className="event-dialog__backdrop" aria-hidden="true" onClick={onClose} />
      <section
        className={`event-dialog__panel ${eventToneClassName(event.eventType.id)}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="event-dialog__header">
          <div>
            <span className="event-dialog__type">{event.eventType.name}</span>
            <h2 id={titleId}>{event.title}</h2>
          </div>
          <button
            ref={closeButton}
            className="icon-button"
            type="button"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <dl className="event-dialog__details">
          <div>
            <dt>Quando</dt>
            <dd>
              {formatDayHeading(startDay, today)} · {formatTimeRange(event)}
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
              <dd className="event-dialog__description">{event.description}</dd>
            </div>
          ) : null}
          <div>
            <dt>Participantes</dt>
            <dd>
              {event.participants.length === 0 ? (
                'Nenhum participante'
              ) : (
                <ul className="event-dialog__participants">
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
      </section>
    </div>
  );
}
