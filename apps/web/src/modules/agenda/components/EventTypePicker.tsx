import type { EventTypeResponse } from '@casaecos/shared-types';

import { fieldErrorId } from '../../../shared/ui/field-error-props.js';
import { RequiredMark } from '../../../shared/ui/FormField.js';
import { eventToneClassName } from '../domain/event-tone.js';
import { EventTypeGlyph } from './EventTypeIcon.js';

const FIELD_ID = 'event-type';

interface EventTypePickerProps {
  eventTypes: EventTypeResponse[];
  eventTypeId: number | null;
  error: string | undefined;
  isDisabled: boolean;
  onChange: (eventTypeId: number) => void;
}

/** The type as one tap on a card, in the color the agenda draws that type with. */
export function EventTypePicker({
  eventTypes,
  eventTypeId,
  error,
  isDisabled,
  onChange,
}: EventTypePickerProps): React.JSX.Element {
  return (
    <fieldset
      className="type-field"
      aria-describedby={error === undefined ? undefined : fieldErrorId(FIELD_ID)}
    >
      <legend>
        Tipo de compromisso
        <RequiredMark />
      </legend>
      <div className={error === undefined ? 'type-picker' : 'type-picker type-picker--invalid'}>
        {eventTypes.map((eventType) => (
          <label key={eventType.id} className={`type-option ${eventToneClassName(eventType.id)}`}>
            <input
              className="visually-hidden"
              type="radio"
              name={FIELD_ID}
              checked={eventTypeId === eventType.id}
              disabled={isDisabled}
              required
              onChange={() => {
                onChange(eventType.id);
              }}
            />
            <EventTypeGlyph eventTypeId={eventType.id} />
            {eventType.name}
          </label>
        ))}
      </div>
      {error === undefined ? null : (
        <p className="form-field__error" id={fieldErrorId(FIELD_ID)}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
