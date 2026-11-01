import { useCallback, useEffect, useMemo, useState } from 'react';

import type { HomeResponse } from '@casaecos/shared-types';

import { useAuth } from '../../auth/context/use-auth.js';
import { homeService } from '../services/home-service.js';
import { HomeSelectionContext } from './home-selection-context.js';

interface HomeSelectionProviderProps {
  children: React.ReactNode;
}

/**
 * The home picked in the sidebar, shared by every screen of the logged-in area. The
 * list comes already cut by the user's scope, so a caregiver only gets her homes.
 */
export function HomeSelectionProvider({ children }: HomeSelectionProviderProps): React.JSX.Element {
  const { can } = useAuth();
  const canReadHomes = can('home:read');
  const [homes, setHomes] = useState<HomeResponse[]>([]);
  const [selectedHomeId, setSelectedHomeId] = useState<number | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!canReadHomes) return;

    let current = true;
    // A failed list only leaves the picker on "Todas as casas": the agenda still loads.
    homeService.list().then(
      (loadedHomes) => {
        if (current) setHomes(loadedHomes);
      },
      () => undefined,
    );

    return () => {
      current = false;
    };
  }, [canReadHomes, reloadCount]);

  const reloadHomes = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  // A removed home cannot stay picked: the agenda would filter by a home that is gone.
  const pickedHomeId =
    selectedHomeId !== null && homes.some(({ id }) => id === selectedHomeId)
      ? selectedHomeId
      : null;

  const value = useMemo(
    () => ({
      homes,
      selectedHomeId: pickedHomeId,
      canChooseHome: homes.length > 1,
      selectHome: setSelectedHomeId,
      reloadHomes,
    }),
    [homes, pickedHomeId, reloadHomes],
  );

  return <HomeSelectionContext value={value}>{children}</HomeSelectionContext>;
}
