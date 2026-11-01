import {
  Box,
  Button,
  ButtonGroup,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

import { ChevronLeftIcon, ChevronRightIcon } from '../../../shared/ui/icons.js';
import type { AgendaView } from '../domain/calendar-period.js';

interface AgendaNavigationProps {
  view: AgendaView;
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  onShowToday: () => void;
  onChangeView: (view: AgendaView) => void;
}

const VIEW_LABELS: Record<AgendaView, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
};

export function AgendaNavigation({
  view,
  label,
  onPrevious,
  onNext,
  onShowToday,
  onChangeView,
}: AgendaNavigationProps): React.JSX.Element {
  const periodName = VIEW_LABELS[view].toLocaleLowerCase('pt-BR');

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { md: '1fr auto 1fr' },
        alignItems: { md: 'center' },
        mb: { xs: 1.5, md: 0 },
        p: { md: 2 },
        borderBottom: { md: 1 },
        borderColor: { md: 'divider' },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <ButtonGroup variant="outlined" color="inherit" size="small">
          <Button aria-label={`${VIEW_LABELS[view]} anterior`} onClick={onPrevious}>
            <ChevronLeftIcon />
          </Button>
          <Button
            aria-label={`Próxim${view === 'week' ? 'a' : 'o'} ${periodName}`}
            onClick={onNext}
          >
            <ChevronRightIcon />
          </Button>
        </ButtonGroup>
        <Button variant="outlined" color="inherit" onClick={onShowToday}>
          Hoje
        </Button>
      </Stack>

      <Typography
        component="h2"
        variant="h6"
        aria-live="polite"
        sx={{ fontWeight: 600, textAlign: { md: 'center' } }}
      >
        {label}
      </Typography>

      <ToggleButtonGroup
        sx={{ display: { xs: 'flex', md: 'inline-flex' }, justifySelf: { md: 'end' } }}
        aria-label="Visão"
        color="primary"
        exclusive
        size="small"
        value={view}
        onChange={(_clickEvent, chosenView: AgendaView | null) => {
          // The pressed button answers with null: a view is always on.
          if (chosenView !== null) onChangeView(chosenView);
        }}
      >
        {(Object.entries(VIEW_LABELS) as [AgendaView, string][]).map(([candidate, name]) => (
          <ToggleButton
            key={candidate}
            sx={{ flex: { xs: 1, md: 'initial' }, px: 2 }}
            value={candidate}
          >
            {name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
