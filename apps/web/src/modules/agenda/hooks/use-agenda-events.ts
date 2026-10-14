import { useCallback, useEffect, useState } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../shared/http/api-request-error.js';
import type { AgendaView } from '../domain/calendar-period.js';
import { periodFor } from '../domain/calendar-period.js';
import type { CalendarMonth } from '../domain/calendar-month.js';
import { eventService } from '../services/event-service.js';

const UNEXPECTED_ERROR_MESSAGE = 'Não foi possível carregar a agenda. Tente novamente.';
const PERIOD_PAGE_SIZE = 200;

export interface AgendaFilters {
  homeId?: number;
  eventTypeId?: number;
}

export type AgendaEvents =
  | { status: 'loading' }
  | { status: 'loaded'; events: EventResponse[] }
  | { status: 'failed'; message: string };

interface AgendaEventsResult {
  requestKey: string;
  outcome: AgendaEvents;
}

function failureMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : UNEXPECTED_ERROR_MESSAGE;
}

/**
 * Commitments in the visible month, week or day. Month keeps the paginated `listAll`
 * behavior; the shorter views request a single maximum-size page with their exact period.
 */
export function useAgendaEvents(
  view: AgendaView,
  selectedDay: Date,
  month: CalendarMonth,
  { homeId, eventTypeId }: AgendaFilters,
): { agendaEvents: AgendaEvents; reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<AgendaEventsResult | null>(null);
  const { from, to } = view === 'month' ? month.period() : periodFor(view, selectedDay);
  const requestKey = JSON.stringify({ view, from, to, homeId, eventTypeId, attempt });

  useEffect(() => {
    let current = true;
    const finish = (outcome: AgendaEvents): void => {
      if (current) setResult({ requestKey, outcome });
    };
    const filters = {
      from,
      to,
      ...(homeId === undefined ? {} : { homeId }),
      ...(eventTypeId === undefined ? {} : { eventTypeId }),
    };
    const request =
      view === 'month'
        ? eventService.listAll(filters)
        : eventService.list({ ...filters, pageSize: PERIOD_PAGE_SIZE }).then(({ items }) => items);

    request.then(
      (events) => {
        finish({ status: 'loaded', events });
      },
      (error: unknown) => {
        finish({ status: 'failed', message: failureMessage(error) });
      },
    );

    return () => {
      current = false;
    };
  }, [requestKey, view, from, to, homeId, eventTypeId]);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  const agendaEvents: AgendaEvents =
    result?.requestKey === requestKey ? result.outcome : { status: 'loading' };
  return { agendaEvents, reload };
}
