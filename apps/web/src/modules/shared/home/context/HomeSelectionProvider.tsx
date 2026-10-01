import { useEffect, useMemo, useState } from 'react';

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
  }, [canReadHomes]);

  const value = useMemo(
    () => ({
      homes,
      selectedHomeId,
      canChooseHome: homes.length > 1,
      selectHome: setSelectedHomeId,
    }),
    [homes, selectedHomeId],
  );

  return <HomeSelectionContext value={value}>{children}</HomeSelectionContext>;
}
