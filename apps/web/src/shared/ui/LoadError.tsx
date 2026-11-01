import { Alert, Button } from '@mui/material';

interface LoadErrorProps {
  message: string;
  onRetry: () => void;
}

/** A list that could not be read, with the way to try again. */
export function LoadError({ message, onRetry }: LoadErrorProps): React.JSX.Element {
  return (
    <Alert
      sx={{ my: 1 }}
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Tentar novamente
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
