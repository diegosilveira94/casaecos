import { Button, Chip, Stack, Typography } from '@mui/material';

import type { EventResponse } from '@casaecos/shared-types';

import { Dialog } from '../../../shared/ui/Dialog.js';
import { formatDayHeading, formatTimeRange } from '../domain/event-format.js';
import { eventColors } from '../domain/event-tone.js';

interface DetailProps {
  term: string;
  children: React.ReactNode;
}

function Detail({ term, children }: DetailProps): React.JSX.Element {
  return (
    <div>
      <Typography
        component="dt"
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {term}
      </Typography>
      <Typography component="dd" sx={{ whiteSpace: 'pre-line' }}>
        {children}
      </Typography>
    </div>
  );
}

interface EventDetailsDialogProps {
  event: EventResponse;
  today: Date;
  /** Absent for who cannot change commitments (`event:write`): no "Editar" then. */
  onEdit?: (() => void) | undefined;
  onClose: () => void;
}

/** Read-only view of a commitment; "Editar" leads to the form, which also deletes. */
export function EventDetailsDialog({
  event,
  today,
  onEdit,
  onClose,
}: EventDetailsDialogProps): React.JSX.Element {
  return (
    <Dialog
      title={event.title}
      eyebrow={
        <Typography
          variant="caption"
          sx={{ color: eventColors(event.eventType.id).color, fontWeight: 600 }}
        >
          {event.eventType.name}
        </Typography>
      }
      onClose={onClose}
      actions={
        onEdit ? (
          <Button variant="outlined" onClick={onEdit}>
            Editar
          </Button>
        ) : null
      }
    >
      <Stack component="dl" spacing={1.75}>
        <Detail term="Quando">
          {formatDayHeading(new Date(event.startDate), today)} · {formatTimeRange(event)}
        </Detail>
        <Detail term="Casa">{event.home.name}</Detail>
        {event.address ? <Detail term="Endereço">{event.address}</Detail> : null}
        {event.description ? <Detail term="Descrição">{event.description}</Detail> : null}
        <Detail term="Envolvidos">
          {event.participants.length === 0 ? (
            'Nenhuma pessoa envolvida'
          ) : (
            <Stack component="span" direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
              {event.participants.map(({ person, participationType }) => (
                <Chip
                  key={person.id}
                  component="span"
                  color="primary"
                  size="small"
                  variant="outlined"
                  label={`${person.name} · ${participationType.description}`}
                />
              ))}
            </Stack>
          )}
        </Detail>
      </Stack>
    </Dialog>
  );
}
