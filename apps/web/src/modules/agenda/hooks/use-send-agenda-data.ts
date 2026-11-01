import { useCallback, useEffect, useState } from 'react';

import type { EventResponse, PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../shared/http/api-request-error.js';
import { personService } from '../../shared/person/services/person-service.js';
import type { SendPeriod } from '../domain/send-period.js';
import { eventService } from '../services/event-service.js';

const UNEXPECTED_ERROR_MESSAGE = 'Não foi possível carregar a agenda. Tente novamente.';

export type SendAgendaEvents =
  | { status: 'loading' }
  | { status: 'loaded'; events: EventResponse[] }
  | { status: 'failed'; message: string };

export type SendAgendaPeople =
  | { status: 'loading' }
  | { status: 'loaded'; people: PersonResponse[] }
  | { status: 'failed'; message: string };

interface EventsResult {
  requestKey: string;
  outcome: SendAgendaEvents;
}

function failureMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : UNEXPECTED_ERROR_MESSAGE;
}

/**
 * What a message is written from: everyone (the recipients, and who is sheltered) and
 * the commitments of the period, in every home. The people stay on screen while the
 * period changes; a stale answer for another period is dropped.
 */
export function useSendAgendaData({ from, to }: SendPeriod): {
  people: SendAgendaPeople;
  events: SendAgendaEvents;
  reload: () => void;
} {
  const [attempt, setAttempt] = useState(0);
  const [people, setPeople] = useState<SendAgendaPeople>({ status: 'loading' });
  const [eventsResult, setEventsResult] = useState<EventsResult | null>(null);
  const requestKey = JSON.stringify({ from, to, attempt });

  useEffect(() => {
    let current = true;
    personService.list().then(
      (loaded) => {
        if (current) setPeople({ status: 'loaded', people: loaded });
      },
      (error: unknown) => {
        if (current) setPeople({ status: 'failed', message: failureMessage(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  useEffect(() => {
    let current = true;
    const finish = (outcome: SendAgendaEvents): void => {
      if (current) setEventsResult({ requestKey, outcome });
    };
    eventService.listAll({ from, to }).then(
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
  }, [requestKey, from, to]);

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  const events: SendAgendaEvents =
    eventsResult?.requestKey === requestKey ? eventsResult.outcome : { status: 'loading' };
  return { people, events, reload };
}
