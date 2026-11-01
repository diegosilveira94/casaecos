import { Alert } from '@mui/material';

interface AlertMessageProps {
  children: React.ReactNode;
}

/** A failure the user has to read before going on, such as a save the API refused. */
export function AlertMessage({ children }: AlertMessageProps): React.JSX.Element {
  return (
    <Alert severity="error" sx={{ width: '100%' }}>
      {children}
    </Alert>
  );
}
