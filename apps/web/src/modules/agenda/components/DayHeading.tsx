import { Stack, Typography } from '@mui/material';

interface DayHeadingProps {
  level: 'h2' | 'h3';
  title: string;
  /** How many commitments the day has, once that is known. */
  count?: number | undefined;
}

/** The day above its list of commitments. */
export function DayHeading({ level, title, count }: DayHeadingProps): React.JSX.Element {
  return (
    <Stack
      component="header"
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}
    >
      <Typography
        color="primary"
        component={level}
        variant="caption"
        sx={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}
      >
        {title}
      </Typography>
      {count === undefined ? null : (
        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {count} {count === 1 ? 'compromisso' : 'compromissos'}
        </Typography>
      )}
    </Stack>
  );
}
