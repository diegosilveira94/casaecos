import { createContext } from 'react';

import type { HomeResponse } from '@casaecos/shared-types';

export interface HomeSelection {
  /** Homes the user can see; empty for roles without `home:read`. */
  homes: HomeResponse[];
  /** `null` means every home in the user's scope. */
  selectedHomeId: number | null;
  /** False when there is nothing to choose: one home, or no access to homes. */
  canChooseHome: boolean;
  selectHome: (homeId: number | null) => void;
}

export const HomeSelectionContext = createContext<HomeSelection | null>(null);
