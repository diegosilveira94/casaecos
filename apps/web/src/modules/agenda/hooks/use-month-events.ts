import { useCallback, useEffect, useState } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../shared/http/api-request-error.js';
import type { CalendarMonth } from '../domain/calendar-month.js';
import { eventService } from '../services/event-service.js';

const UNEXPECTED_ERROR_MESSAGE = 'Não foi possível carregar a agenda. Tente novamente.';

export interface AgendaFilters {
  homeId?: number;
  eventTypeId?: number;
}

export type MonthEvents =
  | { status: 'loading' }
  | { status: 'loaded'; events: EventResponse[] }
  | { status: 'failed'; message: string };

interface MonthEventsResult {
  requestKey: string;
  outcome: MonthEvents;
}

function failureMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : UNEXPECTED_ERROR_MESSAGE;
}

/**
 * Every commitment of the month that matches the filters. The result is tagged with
 * the request that produced it, so changing month or filter reads as `loading` at
 * once and a slow answer to an old request is ignored.
 */
export function useMonthEvents(
  month: CalendarMonth,
  { homeId, eventTypeId }: AgendaFilters,
): { monthEvents: MonthEvents; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<MonthEventsResult | null>(null);
  const { from, to } = month.period();
  const requestKey = JSON.stringify({ from, to, homeId, eventTypeId, attempt });

  useEffect(() => {
    let current = true;
    const finish = (outcome: MonthEvents): void => {
      if (current) setResult({ requestKey, outcome });
    };

    eventService
      .listAll({
        from,
        to,
        ...(homeId === undefined ? {} : { homeId }),
        ...(eventTypeId === undefined ? {} : { eventTypeId }),
      })
      .then(
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
  }, [requestKey, from, to, homeId, eventTypeId]);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  const monthEvents: MonthEvents =
    result?.requestKey === requestKey ? result.outcome : { status: 'loading' };
  return { monthEvents, retry };
}
