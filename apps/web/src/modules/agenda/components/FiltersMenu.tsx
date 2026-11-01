import { Box, Button, Chip, Paper, TextField } from '@mui/material';
import { useCallback, useRef, useState } from 'react';

import type { EventTypeResponse } from '@casaecos/shared-types';

import { FilterIcon } from '../../../shared/ui/icons.js';
import { useDismiss } from '../../../shared/ui/use-dismiss.js';

interface FiltersMenuProps {
  eventTypes: EventTypeResponse[];
  eventTypeId: number | undefined;
  onChangeEventType: (eventTypeId: number | undefined) => void;
}

const ALL_TYPES = '';

/** "Filtros" of the prototype. The home is picked in the sidebar; here goes the type. */
export function FiltersMenu({
  eventTypes,
  eventTypeId,
  onChangeEventType,
}: FiltersMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);
  useDismiss(menu, isOpen, close);

  const activeCount = eventTypeId === undefined ? 0 : 1;

  return (
    <Box ref={menu} sx={{ position: 'relative' }}>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<FilterIcon />}
        aria-expanded={isOpen}
        {...(activeCount > 0 ? { 'aria-label': `Filtros (${String(activeCount)} ativo)` } : {})}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        Filtros
        {activeCount > 0 ? (
          <Chip
            component="span"
            color="primary"
            size="small"
            label={activeCount}
            aria-hidden="true"
            sx={{ ml: 1, height: 20 }}
          />
        ) : null}
      </Button>

      {/* Not a modal: the calendar behind it answers to the filter as it changes. */}
      {isOpen ? (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: 'calc(100% + 0.4rem)',
            left: 0,
            zIndex: 'modal',
            minWidth: '15rem',
            p: 2,
          }}
        >
          <TextField
            select
            size="small"
            label="Tipo de compromisso"
            value={eventTypeId ?? ALL_TYPES}
            onChange={(event) => {
              const { value } = event.target;
              onChangeEventType(value === ALL_TYPES ? undefined : Number(value));
            }}
            slotProps={{ select: { native: true } }}
          >
            <option value={ALL_TYPES}>Todos os tipos</option>
            {eventTypes.map((eventType) => (
              <option key={eventType.id} value={eventType.id}>
                {eventType.name}
              </option>
            ))}
          </TextField>
        </Paper>
      ) : null}
    </Box>
  );
}
