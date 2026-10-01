/**
 * Props of a control the prototype shows but whose feature does not exist yet: it
 * looks like the real one, does nothing, and says so to the mouse and to screen readers.
 */
export const COMING_SOON_PROPS = {
  type: 'button',
  'aria-disabled': true,
  title: 'Disponível em breve',
} as const;
