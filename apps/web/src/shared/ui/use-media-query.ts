import { useSyncExternalStore } from 'react';

/** Same breakpoint as the CSS (`@media (min-width: 52rem)` in index.css). */
export const DESKTOP_MEDIA_QUERY = '(min-width: 52rem)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => {
        media.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_MEDIA_QUERY);
}
