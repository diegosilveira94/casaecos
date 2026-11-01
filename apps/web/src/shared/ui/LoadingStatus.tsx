import { CircularProgress, Stack, Typography } from '@mui/material';

/** A quiet line while a list is on its way. */
export function LoadingStatus({ children }: { children: string }): React.JSX.Element {
  return (
    <Stack direction="row" role="status" spacing={1} sx={{ alignItems: 'center', my: 1 }}>
      <CircularProgress size={16} aria-hidden="true" />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {children}
      </Typography>
    </Stack>
  );
}
