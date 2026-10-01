import { useEffect, type RefObject } from 'react';

/** Closes a popover on a click outside `container` or on Escape, while it is open. */
export function useDismiss(
  container: RefObject<HTMLElement | null>,
  isOpen: boolean,
  close: () => void,
): void {
  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: MouseEvent): void => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) close();
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [container, isOpen, close]);
}
