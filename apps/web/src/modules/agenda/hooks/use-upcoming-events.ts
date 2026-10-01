import { useEffect, useState } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { toOffsetIsoString } from '../domain/calendar-dates.js';
import { eventService } from '../services/event-service.js';
import type { AgendaFilters } from './use-month-events.js';

const UPCOMING_COUNT = 4;

export type UpcomingEvents =
  { status: 'loading' } | { status: 'loaded'; events: EventResponse[] } | { status: 'failed' };

interface UpcomingEventsResult {
  requestKey: string;
  outcome: UpcomingEvents;
}

/** The next commitments from now on, with the same filters as the month. */
export function useUpcomingEvents({ homeId, eventTypeId }: AgendaFilters): UpcomingEvents {
  const [result, setResult] = useState<UpcomingEventsResult | null>(null);
  const requestKey = JSON.stringify({ homeId, eventTypeId });

  useEffect(() => {
    let current = true;
    const finish = (outcome: UpcomingEvents): void => {
      if (current) setResult({ requestKey, outcome });
    };

    eventService
      .list({
        from: toOffsetIsoString(new Date()),
        pageSize: UPCOMING_COUNT,
        ...(homeId === undefined ? {} : { homeId }),
        ...(eventTypeId === undefined ? {} : { eventTypeId }),
      })
      .then(
        ({ items }) => {
          finish({ status: 'loaded', events: items });
        },
        () => {
          finish({ status: 'failed' });
        },
      );

    return () => {
      current = false;
    };
  }, [requestKey, homeId, eventTypeId]);

  return result?.requestKey === requestKey ? result.outcome : { status: 'loading' };
}
