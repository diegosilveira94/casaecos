interface LoadErrorProps {
  message: string;
  onRetry: () => void;
}

/** A list that could not be read, with the way to try again. */
export function LoadError({ message, onRetry }: LoadErrorProps): React.JSX.Element {
  return (
    <div className="month-load-error" role="alert">
      <p>{message}</p>
      <button className="outline-button" type="button" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}
