import { Box, Stack, Typography } from '@mui/material';

import type { EventResponse } from '@casaecos/shared-types';

import { LoadError } from '../../../shared/ui/LoadError.js';
import { LoadingStatus } from '../../../shared/ui/LoadingStatus.js';
import { dayKey } from '../domain/calendar-dates.js';
import { formatDayHeading } from '../domain/event-format.js';
import type { AgendaEvents } from '../hooks/use-agenda-events.js';
import { DayHeading } from './DayHeading.js';
import { EventCardList } from './EventCardList.js';

interface WeekEventListProps {
  days: Date[];
  today: Date;
  eventsByDay: ReadonlyMap<string, EventResponse[]>;
  agendaEvents: AgendaEvents;
  onRetry: () => void;
  onOpenEvent: (event: EventResponse) => void;
}

export function WeekEventList({
  days,
  today,
  eventsByDay,
  agendaEvents,
  onRetry,
  onOpenEvent,
}: WeekEventListProps): React.JSX.Element {
  if (agendaEvents.status === 'loading') {
    return <LoadingStatus>Carregando compromissos...</LoadingStatus>;
  }

  if (agendaEvents.status === 'failed') {
    return <LoadError message={agendaEvents.message} onRetry={onRetry} />;
  }

  const daysWithEvents = days.filter((day) => (eventsByDay.get(dayKey(day))?.length ?? 0) > 0);
  if (daysWithEvents.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', my: 1 }}>
        Nenhum compromisso nesta semana.
      </Typography>
    );
  }

  return (
    <Stack component="section" aria-label="Compromissos da semana" spacing={2} sx={{ pt: 0.5 }}>
      {daysWithEvents.map((day) => {
        const events = eventsByDay.get(dayKey(day)) ?? [];
        return (
          <Box component="section" key={dayKey(day)} sx={{ minWidth: 0 }}>
            <DayHeading level="h3" title={formatDayHeading(day, today)} count={events.length} />
            <EventCardList events={events} onOpenEvent={onOpenEvent} />
          </Box>
        );
      })}
    </Stack>
  );
}
