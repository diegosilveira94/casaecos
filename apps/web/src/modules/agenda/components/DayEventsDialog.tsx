import type { EventResponse } from '@casaecos/shared-types';

import { Dialog } from '../../../shared/ui/Dialog.js';
import { formatDayHeading } from '../domain/event-format.js';
import { EventCardList } from './EventCardList.js';

interface DayEventsDialogProps {
  day: Date;
  today: Date;
  events: EventResponse[];
  onOpenEvent: (event: EventResponse) => void;
  onClose: () => void;
}

/** Desktop: every commitment of a day, opened from the day number or "+N compromissos". */
export function DayEventsDialog({
  day,
  today,
  events,
  onOpenEvent,
  onClose,
}: DayEventsDialogProps): React.JSX.Element {
  return (
    <Dialog title={formatDayHeading(day, today)} onClose={onClose}>
      <EventCardList events={events} onOpenEvent={onOpenEvent} />
    </Dialog>
  );
}
