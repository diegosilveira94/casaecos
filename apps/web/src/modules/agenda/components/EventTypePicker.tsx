import { Box, Stack } from '@mui/material';

import type { EventTypeResponse } from '@casaecos/shared-types';

import { ChoiceCard } from '../../../shared/ui/ChoiceCard.js';
import { FieldGroup } from '../../../shared/ui/FieldGroup.js';
import { eventColors } from '../domain/event-tone.js';
import { EventTypeGlyph } from './EventTypeIcon.js';

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
    <FieldGroup legend="Tipo de compromisso" isRequired error={error}>
      <Box
        sx={{ display: 'grid', gap: 1, gridTemplateColumns: { md: 'repeat(2, minmax(0, 1fr))' } }}
      >
        {eventTypes.map((eventType) => (
          <ChoiceCard
            key={eventType.id}
            kind="radio"
            name="event-type"
            checkedColors={eventColors(eventType.id)}
            label={
              <Stack
                component="span"
                direction="row"
                sx={{
                  alignItems: 'center',
                  gap: 1,
                  '& svg': { fontSize: '1.25rem', color: eventColors(eventType.id).color },
                }}
              >
                <EventTypeGlyph eventTypeId={eventType.id} />
                {eventType.name}
              </Stack>
            }
            isChecked={eventTypeId === eventType.id}
            isDisabled={isDisabled}
            onChange={() => {
              onChange(eventType.id);
            }}
          />
        ))}
      </Box>
    </FieldGroup>
  );
}
