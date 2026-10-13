import {
  BrainIcon,
  CalendarIcon,
  ChatIcon,
  PeopleIcon,
  SchoolBusIcon,
  StethoscopeIcon,
} from '../../../shared/ui/icons.js';
import { eventToneClassName, eventToneFor, type EventTone } from '../domain/event-tone.js';

const ICON_BY_TONE: Record<EventTone, () => React.JSX.Element> = {
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
  return (
    <span className={`event-type-icon ${eventToneClassName(eventTypeId)}`}>
      <EventTypeGlyph eventTypeId={eventTypeId} />
    </span>
  );
}
