import { Box, Button, ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material';

import type { EventResponse } from '@casaecos/shared-types';

import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import { CalendarIcon, ClockIcon } from '../../../shared/ui/icons.js';
import { eventSubject, formatDate, formatTime } from '../domain/event-format.js';
import { eventColors } from '../domain/event-tone.js';
import type { UpcomingEvents } from '../hooks/use-upcoming-events.js';
import { EventTypeIcon } from './EventTypeIcon.js';

interface UpcomingEventsPanelProps {
  upcomingEvents: UpcomingEvents;
  onOpenEvent: (event: EventResponse) => void;
}

function PanelStatus({ children }: { children: string }): React.JSX.Element {
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary', p: 2.5 }}>
      {children}
    </Typography>
  );
}

function MetaLine({ icon, text }: { icon: React.ReactNode; text: string }): React.JSX.Element {
  return (
    <Stack
      component="span"
      direction="row"
      spacing={0.75}
      sx={{ alignItems: 'center', color: 'text.secondary', '& svg': { fontSize: '1rem' } }}
    >
      {icon}
      <Typography component="span" variant="body2">
        {text}
      </Typography>
    </Stack>
  );
}

function UpcomingList({
  upcomingEvents,
  onOpenEvent,
}: UpcomingEventsPanelProps): React.JSX.Element {
  if (upcomingEvents.status === 'loading') return <PanelStatus>Carregando...</PanelStatus>;
  if (upcomingEvents.status === 'failed') {
    return <PanelStatus>Não foi possível carregar.</PanelStatus>;
  }
  if (upcomingEvents.events.length === 0) {
    return <PanelStatus>Nenhum compromisso pela frente.</PanelStatus>;
  }

  return (
    <Box component="ul" sx={{ py: 1 }}>
      {upcomingEvents.events.map((event) => {
        const { color, tint } = eventColors(event.eventType.id);
        return (
          <li key={event.id}>
            <ButtonBase
              onClick={() => {
                onOpenEvent(event);
              }}
              sx={{
                alignItems: 'flex-start',
                gap: 2,
                width: '100%',
                px: 2,
                py: 2,
                textAlign: 'left',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <EventTypeIcon eventTypeId={event.eventType.id} />
              <Stack component="span" spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap component="strong" variant="body2" sx={{ fontWeight: 600 }}>
                  {event.title}
                </Typography>
                <Typography noWrap component="strong" variant="body2" sx={{ fontWeight: 600 }}>
                  {eventSubject(event)}
                </Typography>
                <MetaLine icon={<CalendarIcon />} text={formatDate(event.startDate)} />
                <MetaLine icon={<ClockIcon />} text={formatTime(event.startDate)} />
                <Chip
                  component="span"
                  size="small"
                  label={event.home.name}
                  sx={{ alignSelf: 'flex-end', bgcolor: tint, color }}
                />
              </Stack>
            </ButtonBase>
          </li>
        );
      })}
    </Box>
  );
}

export function UpcomingEventsPanel(props: UpcomingEventsPanelProps): React.JSX.Element {
  return (
    <Paper
      component="section"
      variant="outlined"
      aria-labelledby="upcoming-events-title"
      sx={{ minWidth: 0, overflow: 'hidden', borderRadius: 3 }}
    >
      <Typography
        id="upcoming-events-title"
        component="h2"
        variant="subtitle1"
        sx={{ px: 2.5, py: 2, fontWeight: 600, borderBottom: 1, borderColor: 'divider' }}
      >
        Próximos compromissos
      </Typography>
      <UpcomingList {...props} />
      <Button
        fullWidth
        {...COMING_SOON_PROPS}
        sx={{ p: 2, borderTop: 1, borderColor: 'divider', borderRadius: 0 }}
      >
        Ver todos
      </Button>
    </Paper>
  );
}
