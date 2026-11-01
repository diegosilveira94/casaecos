interface AlertMessageProps {
  children: React.ReactNode;
}

/** A failure the user has to read before going on, such as a save the API refused. */
export function AlertMessage({ children }: AlertMessageProps): React.JSX.Element {
  return (
    <div className="login-error" role="alert">
      <span aria-hidden="true">!</span>
      <p>{children}</p>
    </div>
  );
}
