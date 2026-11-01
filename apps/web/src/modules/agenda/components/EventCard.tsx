import { Card, CardActionArea, Stack, Typography } from '@mui/material';

import type { EventResponse } from '@casaecos/shared-types';

import { formatTimeRange, participantNames } from '../domain/event-format.js';
import { eventColors } from '../domain/event-tone.js';

interface EventCardProps {
  event: EventResponse;
  onOpen: (event: EventResponse) => void;
}

export function EventCard({ event, onOpen }: EventCardProps): React.JSX.Element {
  const names = participantNames(event);
  const { color } = eventColors(event.eventType.id);

  return (
    <Card variant="outlined" sx={{ borderLeft: 4, borderLeftColor: color }}>
      <CardActionArea
        onClick={() => {
          onOpen(event);
        }}
        sx={{ px: 1.75, py: 1.5 }}
      >
        <Stack
          component="span"
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}
        >
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
            {formatTimeRange(event)}
          </Typography>
          <Typography component="span" variant="caption" sx={{ color, fontWeight: 600 }}>
            {event.eventType.name}
          </Typography>
        </Stack>
        <Typography component="strong" sx={{ display: 'block', fontWeight: 600 }}>
          {event.title}
        </Typography>
        <Typography
          component="span"
          variant="body2"
          sx={{ color: 'text.secondary', display: 'block' }}
        >
          {event.home.name}
        </Typography>
        {names ? (
          <Typography component="span" variant="body2" sx={{ display: 'block' }}>
            {names}
          </Typography>
        ) : null}
      </CardActionArea>
    </Card>
  );
}
