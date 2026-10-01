import { useEffect, useState } from 'react';

import type { EventTypeResponse, HomeResponse } from '@casaecos/shared-types';

import { homeService } from '../../shared/home/services/home-service.js';
import { eventService } from '../services/event-service.js';

export interface AgendaFilterOptions {
  eventTypes: EventTypeResponse[];
  homes: HomeResponse[];
}

// A lookup that fails only leaves its filter out: the agenda itself still loads, and
// its own error is the one the screen shows.
function loadOrEmpty<T>(load: () => Promise<T[]>): Promise<T[]> {
  return load().catch(() => []);
}

/** Options of the filters. Homes are only asked for when the role can read them. */
export function useAgendaFilterOptions(canReadHomes: boolean): AgendaFilterOptions {
  const [options, setOptions] = useState<AgendaFilterOptions>({ eventTypes: [], homes: [] });

  useEffect(() => {
    let current = true;

    void Promise.all([
      loadOrEmpty(() => eventService.listEventTypes()),
      canReadHomes ? loadOrEmpty(() => homeService.list()) : Promise.resolve([]),
    ]).then(([eventTypes, homes]) => {
      if (current) setOptions({ eventTypes, homes });
    });

    return () => {
      current = false;
    };
  }, [canReadHomes]);

  return options;
}
