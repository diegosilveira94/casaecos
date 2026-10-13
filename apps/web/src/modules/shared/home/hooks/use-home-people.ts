import { useEffect, useState } from 'react';

import type { PersonResponse } from '@casaecos/shared-types';

import { homeService } from '../services/home-service.js';

export type HomePeople =
  | { status: 'no-home' }
  | { status: 'loading' }
  | { status: 'loaded'; people: PersonResponse[] }
  | { status: 'failed' };

interface HomePeopleResult {
  homeId: number;
  outcome: HomePeople;
}

/**
 * Everyone linked to a home. The result is tagged with its home, so picking another
 * one reads as `loading` at once and a slow answer for the old home is ignored.
 */
export function useHomePeople(homeId: number | null): HomePeople {
  const [result, setResult] = useState<HomePeopleResult | null>(null);

  useEffect(() => {
    if (homeId === null) return;

    let current = true;
    const finish = (outcome: HomePeople): void => {
      if (current) setResult({ homeId, outcome });
    };

    homeService.listPeople(homeId).then(
      (people) => {
        finish({ status: 'loaded', people });
      },
      () => {
        finish({ status: 'failed' });
      },
    );

    return () => {
      current = false;
    };
  }, [homeId]);

  if (homeId === null) return { status: 'no-home' };
  return result?.homeId === homeId ? result.outcome : { status: 'loading' };
}
