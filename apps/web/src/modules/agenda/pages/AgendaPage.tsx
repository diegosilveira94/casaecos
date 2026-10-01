import { useCallback, useMemo, useState } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { useAuth } from '../../shared/auth/context/use-auth.js';
import { AppHeader } from '../../shared/layout/AppHeader.js';
import { AgendaFiltersBar } from '../components/AgendaFiltersBar.js';
import { DayEvents } from '../components/DayEvents.js';
import { EventDetailsDialog } from '../components/EventDetailsDialog.js';
import { MonthGrid } from '../components/MonthGrid.js';
import { MonthNavigation } from '../components/MonthNavigation.js';
import { dayKey, startOfDay } from '../domain/calendar-dates.js';
import { CalendarMonth } from '../domain/calendar-month.js';
import { groupEventsByDay } from '../domain/event-format.js';
import { useAgendaFilterOptions } from '../hooks/use-agenda-filter-options.js';
import { useMonthEvents, type AgendaFilters } from '../hooks/use-month-events.js';

const NO_EVENTS: EventResponse[] = [];

export function AgendaPage(): React.JSX.Element {
  const { can } = useAuth();
  const [today] = useState(() => startOfDay(new Date()));
  const [month, setMonth] = useState(() => CalendarMonth.containing(today));
  const [selectedDay, setSelectedDay] = useState(today);
  const [filters, setFilters] = useState<AgendaFilters>({});
  const [openEvent, setOpenEvent] = useState<EventResponse | null>(null);

  const { eventTypes, homes } = useAgendaFilterOptions(can('home:read'));
  const { monthEvents, retry } = useMonthEvents(month, filters);

  const eventsByDay = useMemo(
    () => groupEventsByDay(monthEvents.status === 'loaded' ? monthEvents.events : NO_EVENTS),
    [monthEvents],
  );

  const showMonth = useCallback(
    (target: CalendarMonth) => {
      setMonth(target);
      setSelectedDay(target.contains(today) ? today : target.firstDay);
    },
    [today],
  );

  const closeEvent = useCallback(() => {
    setOpenEvent(null);
  }, []);

  // A caregiver of a single home has nothing to choose between.
  const homeOptions = homes.length > 1 ? homes : [];

  return (
    <div className="agenda-page">
      <AppHeader />

      <main className="agenda-main">
        <div className="agenda-heading">
          <h1>Agenda</h1>
          <AgendaFiltersBar
            eventTypes={eventTypes}
            homes={homeOptions}
            filters={filters}
            onChange={setFilters}
          />
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
            <MonthGrid
              month={month}
              today={today}
              selectedDay={selectedDay}
              eventsByDay={eventsByDay}
              isLoading={monthEvents.status === 'loading'}
              onSelectDay={setSelectedDay}
            />
          </section>

          <DayEvents
            day={selectedDay}
            today={today}
            monthEvents={monthEvents}
            dayEvents={eventsByDay.get(dayKey(selectedDay)) ?? NO_EVENTS}
            onRetry={retry}
            onOpenEvent={setOpenEvent}
          />
        </div>
      </main>

      {openEvent ? (
        <EventDetailsDialog event={openEvent} today={today} onClose={closeEvent} />
      ) : null}
    </div>
  );
}
