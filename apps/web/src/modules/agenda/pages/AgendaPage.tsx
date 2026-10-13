import { useCallback, useMemo, useState } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { COMING_SOON_PROPS } from '../../../shared/ui/coming-soon.js';
import { PlusIcon, UploadIcon } from '../../../shared/ui/icons.js';
import { useIsDesktop } from '../../../shared/ui/use-media-query.js';
import { useAuth } from '../../shared/auth/context/use-auth.js';
import { useHomeSelection } from '../../shared/home/context/use-home-selection.js';
import { DayEvents } from '../components/DayEvents.js';
import { DayEventsDialog } from '../components/DayEventsDialog.js';
import { EventDetailsDialog } from '../components/EventDetailsDialog.js';
import { EventFormDialog } from '../components/EventFormDialog.js';
import { FiltersMenu } from '../components/FiltersMenu.js';
import { MonthGrid } from '../components/MonthGrid.js';
import { MonthLoadError } from '../components/MonthLoadError.js';
import { MonthNavigation } from '../components/MonthNavigation.js';
import { UpcomingEventsPanel } from '../components/UpcomingEventsPanel.js';
import { dayKey, startOfDay } from '../domain/calendar-dates.js';
import { CalendarMonth } from '../domain/calendar-month.js';
import { groupEventsByDay } from '../domain/event-format.js';
import { useEventTypes } from '../hooks/use-event-types.js';
import { useMonthEvents, type AgendaFilters } from '../hooks/use-month-events.js';
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
  const [month, setMonth] = useState(() => CalendarMonth.containing(today));
  const [selectedDay, setSelectedDay] = useState(today);
  const [eventTypeId, setEventTypeId] = useState<number | undefined>();
  const [openEvent, setOpenEvent] = useState<EventResponse | null>(null);
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [formTarget, setFormTarget] = useState<EventFormTarget | null>(null);
  const [upcomingReloadCount, setUpcomingReloadCount] = useState(0);
  const canWriteEvents = can('event:write');

  const eventTypes = useEventTypes();
  const filters = useMemo<AgendaFilters>(
    () => ({
      ...(selectedHomeId === null ? {} : { homeId: selectedHomeId }),
      ...(eventTypeId === undefined ? {} : { eventTypeId }),
    }),
    [selectedHomeId, eventTypeId],
  );
  const { monthEvents, reload: reloadMonth } = useMonthEvents(month, filters);

  const eventsByDay = useMemo(
    () => groupEventsByDay(monthEvents.status === 'loaded' ? monthEvents.events : NO_EVENTS),
    [monthEvents],
  );
  const eventsOf = (day: Date): EventResponse[] => eventsByDay.get(dayKey(day)) ?? NO_EVENTS;

  const showMonth = useCallback(
    (target: CalendarMonth) => {
      setMonth(target);
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
    reloadMonth();
    setUpcomingReloadCount((current) => current + 1);
  };

  const closeForm = (): void => {
    setFormTarget(null);
  };

  // The agenda lands on the day of what was just saved, so the result is in sight.
  const showSavedEvent = (savedEvent: EventResponse): void => {
    const day = startOfDay(new Date(savedEvent.startDate));
    setMonth(CalendarMonth.containing(day));
    setSelectedDay(day);
    reloadEvents();
    closeForm();
  };

  return (
    <>
      <main className="agenda-main">
        <div className="agenda-heading">
          <div>
            <h1>Agenda</h1>
            <p>Visualize e gerencie os compromissos.</p>
          </div>
          <div className="agenda-actions">
            <FiltersMenu
              eventTypes={eventTypes}
              eventTypeId={eventTypeId}
              onChangeEventType={setEventTypeId}
            />
            <button className="outline-button" {...COMING_SOON_PROPS}>
              <UploadIcon />
              Exportar
            </button>
            {canWriteEvents ? (
              <button
                className="primary-button primary-button--compact"
                type="button"
                onClick={() => {
                  setFormTarget({ event: null });
                }}
              >
                <PlusIcon />
                Novo Compromisso
              </button>
            ) : null}
          </div>
        </div>

        <div className="agenda-layout">
          <section className="agenda-calendar" aria-label="Calendário">
            <MonthNavigation
              month={month}
              onShowMonth={showMonth}
              onShowToday={() => {
                showMonth(CalendarMonth.containing(today));
              }}
            />
            {isDesktop && monthEvents.status === 'failed' ? (
              <MonthLoadError message={monthEvents.message} onRetry={reloadMonth} />
            ) : null}
            <MonthGrid
              month={month}
              today={today}
              selectedDay={selectedDay}
              eventsByDay={eventsByDay}
              isLoading={monthEvents.status === 'loading'}
              onSelectDay={selectDay}
              onOpenEvent={openEventDetails}
            />
          </section>

          {isDesktop ? (
            <UpcomingEvents
              filters={filters}
              reloadCount={upcomingReloadCount}
              onOpenEvent={openEventDetails}
            />
          ) : (
            <DayEvents
              day={selectedDay}
              today={today}
              monthEvents={monthEvents}
              dayEvents={eventsOf(selectedDay)}
              onRetry={reloadMonth}
              onOpenEvent={openEventDetails}
            />
          )}
        </div>
      </main>

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
    </>
  );
}
