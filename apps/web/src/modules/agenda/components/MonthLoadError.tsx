interface MonthLoadErrorProps {
  message: string;
  onRetry: () => void;
}

export function MonthLoadError({ message, onRetry }: MonthLoadErrorProps): React.JSX.Element {
  return (
    <div className="month-load-error" role="alert">
      <p>{message}</p>
      <button className="outline-button" type="button" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}
