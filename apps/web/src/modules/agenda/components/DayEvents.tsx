import { Box } from '@mui/material';

import type { EventResponse } from '@casaecos/shared-types';

import { LoadError } from '../../../shared/ui/LoadError.js';
import { LoadingStatus } from '../../../shared/ui/LoadingStatus.js';
import { formatDayHeading } from '../domain/event-format.js';
import type { AgendaEvents } from '../hooks/use-agenda-events.js';
import { DayHeading } from './DayHeading.js';
import { EventCardList } from './EventCardList.js';

interface DayEventsProps {
  day: Date;
  today: Date;
  agendaEvents: AgendaEvents;
  dayEvents: EventResponse[];
  onRetry: () => void;
  onOpenEvent: (event: EventResponse) => void;
}

function DayEventsBody({
  agendaEvents,
  dayEvents,
  onRetry,
  onOpenEvent,
}: Omit<DayEventsProps, 'day' | 'today'>): React.JSX.Element {
  if (agendaEvents.status === 'loading') {
    return <LoadingStatus>Carregando compromissos...</LoadingStatus>;
  }

  if (agendaEvents.status === 'failed') {
    return <LoadError message={agendaEvents.message} onRetry={onRetry} />;
  }

  return <EventCardList events={dayEvents} onOpenEvent={onOpenEvent} />;
}

export function DayEvents({ day, today, ...body }: DayEventsProps): React.JSX.Element {
  const heading = formatDayHeading(day, today);

  return (
    <Box
      component="section"
      aria-label={`Compromissos do dia: ${heading}`}
      sx={{ minWidth: 0, pt: 2, borderTop: 1, borderColor: 'divider' }}
    >
      <DayHeading
        level="h2"
        title={heading}
        count={
          body.agendaEvents.status === 'loaded' && body.dayEvents.length > 0
            ? body.dayEvents.length
            : undefined
        }
      />
      <DayEventsBody {...body} />
    </Box>
  );
}
