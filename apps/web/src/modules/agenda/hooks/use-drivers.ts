import { useEffect, useState } from 'react';

import type { PersonResponse } from '@casaecos/shared-types';

import { personService } from '../../shared/person/services/person-service.js';
import { ROLE_IDS } from '../../shared/person/domain/roles.js';

/**
 * Every driver of the organization: they serve any home, so they are offered in a
 * commitment without being linked to its home. A failed lookup leaves the list empty
 * and the form falls back to the people of the home.
 */
export function useDrivers(): PersonResponse[] {
  const [drivers, setDrivers] = useState<PersonResponse[]>([]);

  useEffect(() => {
    let current = true;
    personService.listByRole(ROLE_IDS.driver).then(
      (loaded) => {
        if (current) setDrivers(loaded);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, []);

  return drivers;
}
