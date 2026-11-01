import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import { PlusIcon, SendIcon, UploadIcon } from '../../../shared/ui/icons.js';
import { LoadError } from '../../../shared/ui/LoadError.js';
import { useIsDesktop } from '../../../shared/ui/use-media-query.js';
import { useAuth } from '../../shared/auth/context/use-auth.js';
import { useHomeSelection } from '../../shared/home/context/use-home-selection.js';
import { AgendaNavigation } from '../components/AgendaNavigation.js';
import { DayEvents } from '../components/DayEvents.js';
import { DayEventsDialog } from '../components/DayEventsDialog.js';
import { EventDetailsDialog } from '../components/EventDetailsDialog.js';
import { EventFormDialog } from '../components/EventFormDialog.js';
import { FiltersMenu } from '../components/FiltersMenu.js';
import { MonthGrid } from '../components/MonthGrid.js';
import { SendAgendaDialog } from '../components/SendAgendaDialog.js';
import { TimeGrid } from '../components/TimeGrid.js';
import { UpcomingEventsPanel } from '../components/UpcomingEventsPanel.js';
import { WeekEventList } from '../components/WeekEventList.js';
import { dayKey, startOfDay } from '../domain/calendar-dates.js';
import {
  dayViewLabel,
  daysOfWeek,
  moveVisibleDate,
  type AgendaView,
  weekViewLabel,
} from '../domain/calendar-period.js';
import { CalendarMonth } from '../domain/calendar-month.js';
import { groupEventsByDay } from '../domain/event-format.js';
import { useAgendaEvents, type AgendaFilters } from '../hooks/use-agenda-events.js';
import { useEventTypes } from '../hooks/use-event-types.js';
import { useUpcomingEvents } from '../hooks/use-upcoming-events.js';

const NO_EVENTS: EventResponse[] = [];

interface UpcomingEventsProps {
  filters: AgendaFilters;
  reloadCount: number;
  onOpenEvent: (event: EventResponse) => void;
}

// Its own component so the upcoming list is only fetched where it is shown (desktop).
function UpcomingEvents({
  filters,
  reloadCount,
  onOpenEvent,
}: UpcomingEventsProps): React.JSX.Element {
  return (
    <UpcomingEventsPanel
      upcomingEvents={useUpcomingEvents(filters, reloadCount)}
      onOpenEvent={onOpenEvent}
    />
  );
}

/** The form dialog when open: `event` null is a new commitment. */
interface EventFormTarget {
  event: EventResponse | null;
}

export function AgendaPage(): React.JSX.Element {
  const { can } = useAuth();
  const { selectedHomeId } = useHomeSelection();
  const isDesktop = useIsDesktop();
  const [today] = useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState(today);
  const [view, setView] = useState<AgendaView>('month');
  const [eventTypeId, setEventTypeId] = useState<number | undefined>();
  const [openEvent, setOpenEvent] = useState<EventResponse | null>(null);
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [formTarget, setFormTarget] = useState<EventFormTarget | null>(null);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [upcomingReloadCount, setUpcomingReloadCount] = useState(0);
  const canWriteEvents = can('event:write');
  // Sending needs the phones of the staff, which only `person:read` can see.
  const canSendAgenda = can('person:read');

  const eventTypes = useEventTypes();
  const filters = useMemo<AgendaFilters>(
    () => ({
      ...(selectedHomeId === null ? {} : { homeId: selectedHomeId }),
      ...(eventTypeId === undefined ? {} : { eventTypeId }),
    }),
    [selectedHomeId, eventTypeId],
  );
  const month = CalendarMonth.containing(selectedDay);
  const { agendaEvents, reload: reloadAgenda } = useAgendaEvents(view, selectedDay, month, filters);

  const eventsByDay = useMemo(
    () => groupEventsByDay(agendaEvents.status === 'loaded' ? agendaEvents.events : NO_EVENTS),
    [agendaEvents],
  );
  const eventsOf = (day: Date): EventResponse[] => eventsByDay.get(dayKey(day)) ?? NO_EVENTS;
  const weekDays = useMemo(() => daysOfWeek(selectedDay), [selectedDay]);
  const navigationLabel =
    view === 'month'
      ? month.label
      : view === 'week'
        ? weekViewLabel(selectedDay)
        : dayViewLabel(selectedDay);

  const showMonth = useCallback(
    (target: CalendarMonth) => {
      setSelectedDay(target.contains(today) ? today : target.firstDay);
    },
    [today],
  );

  // The phone lists the picked day under the grid; the desktop opens it in a dialog.
  const selectDay = (day: Date): void => {
    setSelectedDay(day);
    if (isDesktop) setOpenDay(day);
  };

  const openEventDetails = (event: EventResponse): void => {
    setOpenDay(null);
    setOpenEvent(event);
  };

  const closeEvent = useCallback(() => {
    setOpenEvent(null);
  }, []);
  const closeDay = useCallback(() => {
    setOpenDay(null);
  }, []);

  const reloadEvents = (): void => {
    reloadAgenda();
    setUpcomingReloadCount((current) => current + 1);
  };

  const closeForm = (): void => {
    setFormTarget(null);
  };

  // The agenda lands on the day of what was just saved, so the result is in sight.
  const showSavedEvent = (savedEvent: EventResponse): void => {
    const day = startOfDay(new Date(savedEvent.startDate));
    setSelectedDay(day);
    reloadEvents();
    closeForm();
  };

  return (
    <>
      <Box
        component="main"
        sx={{
          width: '100%',
          maxWidth: '90rem',
          px: { xs: 2, md: 4 },
          pt: { xs: 2.5, md: 3 },
          pb: { xs: 3, md: 4 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { md: 'minmax(0, 1fr) auto' },
            alignItems: { md: 'start' },
          }}
        >
          <div>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 600 }}>
              Agenda
            </Typography>
            <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>
              Visualize e gerencie os compromissos.
            </Typography>
          </div>
          <Stack direction="row" sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: 1.25 }}>
            <FiltersMenu
              eventTypes={eventTypes}
              eventTypeId={eventTypeId}
              onChangeEventType={setEventTypeId}
            />
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<UploadIcon />}
              {...COMING_SOON_PROPS}
            >
              Exportar
            </Button>
            {canSendAgenda ? (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<SendIcon />}
                onClick={() => {
                  setIsSendOpen(true);
                }}
              >
                Enviar agenda
              </Button>
            ) : null}
            {canWriteEvents ? (
              <Button
                variant="contained"
                startIcon={<PlusIcon />}
                onClick={() => {
                  setFormTarget({ event: null });
                }}
              >
                Novo Compromisso
              </Button>
            ) : null}
          </Stack>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { md: 'minmax(0, 1fr) 18.5rem' },
            alignItems: { md: 'start' },
            mt: { xs: 2.5, md: 3.5 },
          }}
        >
          <Paper
            component="section"
            aria-label="Calendário"
            variant={isDesktop ? 'outlined' : 'elevation'}
            elevation={0}
            sx={{
              minWidth: 0,
              overflow: { md: 'hidden' },
              bgcolor: { xs: 'transparent', md: 'background.paper' },
              borderRadius: { md: 3 },
            }}
          >
            <AgendaNavigation
              view={view}
              label={navigationLabel}
              onPrevious={() => {
                if (view === 'month') showMonth(month.previous());
                else setSelectedDay(moveVisibleDate(view, selectedDay, -1));
              }}
              onNext={() => {
                if (view === 'month') showMonth(month.next());
                else setSelectedDay(moveVisibleDate(view, selectedDay, 1));
              }}
              onShowToday={() => {
                setSelectedDay(today);
              }}
              onChangeView={(nextView) => {
                setView(nextView);
              }}
            />
            {isDesktop && agendaEvents.status === 'failed' ? (
              <LoadError message={agendaEvents.message} onRetry={reloadAgenda} />
            ) : null}
            {view === 'month' ? (
              <MonthGrid
                month={month}
                today={today}
                selectedDay={selectedDay}
                eventsByDay={eventsByDay}
                isLoading={agendaEvents.status === 'loading'}
                onSelectDay={selectDay}
                onOpenEvent={openEventDetails}
              />
            ) : isDesktop ? (
              <TimeGrid
                days={view === 'week' ? weekDays : [selectedDay]}
                today={today}
                eventsByDay={eventsByDay}
                isLoading={agendaEvents.status === 'loading'}
                hasError={agendaEvents.status === 'failed'}
                label={view === 'week' ? `Semana de ${navigationLabel}` : navigationLabel}
                onOpenEvent={openEventDetails}
                {...(view === 'week'
                  ? {
                      onShowDay: (day: Date) => {
                        setSelectedDay(day);
                        setView('day');
                      },
                    }
                  : {})}
              />
            ) : view === 'week' ? (
              <WeekEventList
                days={weekDays}
                today={today}
                eventsByDay={eventsByDay}
                agendaEvents={agendaEvents}
                onRetry={reloadAgenda}
                onOpenEvent={openEventDetails}
              />
            ) : null}
          </Paper>

          {isDesktop ? (
            <UpcomingEvents
              filters={filters}
              reloadCount={upcomingReloadCount}
              onOpenEvent={openEventDetails}
            />
          ) : view !== 'week' ? (
            <DayEvents
              day={selectedDay}
              today={today}
              agendaEvents={agendaEvents}
              dayEvents={eventsOf(selectedDay)}
              onRetry={reloadAgenda}
              onOpenEvent={openEventDetails}
            />
          ) : null}
        </Box>
      </Box>

      {openDay ? (
        <DayEventsDialog
          day={openDay}
          today={today}
          events={eventsOf(openDay)}
          onOpenEvent={openEventDetails}
          onClose={closeDay}
        />
      ) : null}
      {openEvent ? (
        <EventDetailsDialog
          event={openEvent}
          today={today}
          onEdit={
            canWriteEvents
              ? () => {
                  setFormTarget({ event: openEvent });
                  setOpenEvent(null);
                }
              : undefined
          }
          onClose={closeEvent}
        />
      ) : null}
      {formTarget ? (
        <EventFormDialog
          event={formTarget.event}
          initialDay={selectedDay}
          eventTypes={eventTypes}
          onSaved={showSavedEvent}
          onDeleted={() => {
            reloadEvents();
            closeForm();
          }}
          onStored={reloadEvents}
          onClose={closeForm}
        />
      ) : null}
      {isSendOpen ? (
        <SendAgendaDialog
          today={today}
          onClose={() => {
            setIsSendOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
