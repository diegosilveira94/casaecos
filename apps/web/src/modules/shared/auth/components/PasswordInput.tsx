import { useState, type ComponentProps } from 'react';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>;

function EyeIcon({ crossed }: { crossed: boolean }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
      {crossed ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

/** Password control shared by login and the authenticated password dialogs. */
export function PasswordInput({ disabled, ...inputProps }: PasswordInputProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-input">
      <input type={isVisible ? 'text' : 'password'} disabled={disabled} {...inputProps} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => {
          setIsVisible((current) => !current);
        }}
        aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
        disabled={disabled}
      >
        <EyeIcon crossed={isVisible} />
      </button>
    </div>
  );
}
