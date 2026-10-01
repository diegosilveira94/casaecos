import { useEffect, useId, useRef } from 'react';

interface DialogProps {
  title: string;
  /** Small line above the title, such as the commitment type. */
  eyebrow?: React.ReactNode;
  className?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Modal shell: bottom sheet on the phone, centered from 52rem. Closes on Escape, on
 * the backdrop and on "Fechar"; focus moves in and goes back to what opened it.
 */
export function Dialog({
  title,
  eyebrow,
  className = '',
  onClose,
  children,
}: DialogProps): React.JSX.Element {
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const openedFrom =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const closeOnEscape = (keyboardEvent: KeyboardEvent): void => {
      if (keyboardEvent.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      openedFrom?.focus();
    };
  }, [onClose]);

  return (
    <div className="dialog">
      <div className="dialog__backdrop" aria-hidden="true" onClick={onClose} />
      <section
        className={`dialog__panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dialog__header">
          <div>
            {eyebrow}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            ref={closeButton}
            className="icon-button"
            type="button"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
