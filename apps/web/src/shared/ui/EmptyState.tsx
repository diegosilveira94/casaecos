import { Paper, Typography } from '@mui/material';

interface EmptyStateProps {
  title: string;
  /** What to do about it. */
  children: string;
}

/** A list with nothing to show yet. */
export function EmptyState({ title, children }: EmptyStateProps): React.JSX.Element {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 5, textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {children}
      </Typography>
    </Paper>
  );
}
