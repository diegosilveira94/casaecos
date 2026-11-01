import { Stack, Typography } from '@mui/material';

import type { EventResponse } from '@casaecos/shared-types';

import { EventCard } from './EventCard.js';

interface EventCardListProps {
  events: EventResponse[];
  onOpenEvent: (event: EventResponse) => void;
}

export function EventCardList({ events, onOpenEvent }: EventCardListProps): React.JSX.Element {
  if (events.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', my: 1 }}>
        Nenhum compromisso neste dia.
      </Typography>
    );
  }

  return (
    <Stack component="ul" spacing={1.25}>
      {events.map((event) => (
        <li key={event.id}>
          <EventCard event={event} onOpen={onOpenEvent} />
        </li>
      ))}
    </Stack>
  );
}
