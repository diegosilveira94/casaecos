import { useEffect, useState } from 'react';

import type { EventTypeResponse } from '@casaecos/shared-types';

import { eventService } from '../services/event-service.js';

/** Options of the type filter. A failed lookup only leaves the filter empty. */
export function useEventTypes(): EventTypeResponse[] {
  const [eventTypes, setEventTypes] = useState<EventTypeResponse[]>([]);

  useEffect(() => {
    let current = true;
    eventService.listEventTypes().then(
      (loaded) => {
        if (current) setEventTypes(loaded);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, []);

  return eventTypes;
}
