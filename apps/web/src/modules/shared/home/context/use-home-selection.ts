import { use } from 'react';

import { HomeSelectionContext, type HomeSelection } from './home-selection-context.js';

export function useHomeSelection(): HomeSelection {
  const selection = use(HomeSelectionContext);

  if (!selection) {
    throw new Error('useHomeSelection precisa ser usado dentro de <HomeSelectionProvider>');
  }

  return selection;
}
