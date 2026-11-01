import { Avatar } from '@mui/material';

import {
  BrainIcon,
  CalendarIcon,
  ChatIcon,
  PeopleIcon,
  SchoolBusIcon,
  StethoscopeIcon,
} from '../../../shared/ui/icons.js';
import { eventColors, eventToneFor, type EventTone } from '../domain/event-tone.js';

const ICON_BY_TONE: Record<EventTone, typeof CalendarIcon> = {
  health: StethoscopeIcon,
  school: SchoolBusIcon,
  therapy: BrainIcon,
  activity: PeopleIcon,
  meeting: ChatIcon,
  neutral: CalendarIcon,
};

/** The bare pictogram of a type, colored by whoever places it. */
export function EventTypeGlyph({ eventTypeId }: { eventTypeId: number }): React.JSX.Element {
  const ToneIcon = ICON_BY_TONE[eventToneFor(eventTypeId)];
  return <ToneIcon />;
}

/** The round badge of the "Próximos compromissos" panel. */
export function EventTypeIcon({ eventTypeId }: { eventTypeId: number }): React.JSX.Element {
  const { color, tint } = eventColors(eventTypeId);

  return (
    <Avatar sx={{ bgcolor: tint, color }}>
      <EventTypeGlyph eventTypeId={eventTypeId} />
    </Avatar>
  );
}
