import { CircularProgress, Stack, Typography } from '@mui/material';

export function SessionRestoring(): React.JSX.Element {
  return (
    <Stack
      component="main"
      aria-busy="true"
      spacing={1.5}
      sx={{ alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}
    >
      <CircularProgress size={28} aria-hidden="true" />
      <Typography sx={{ color: 'text.secondary' }}>Carregando...</Typography>
    </Stack>
  );
}
