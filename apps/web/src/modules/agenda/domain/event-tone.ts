/** Color family of a commitment, named after the seeded `event_type` it stands for. */
export type EventTone = 'health' | 'school' | 'therapy' | 'activity' | 'meeting' | 'neutral';

// Lookup ids are fixed by the seed (#37), so the color can follow the id. A type
// added later shows up neutral until it gets a color here and in index.css.
const TONE_BY_EVENT_TYPE_ID: ReadonlyMap<number, EventTone> = new Map<number, EventTone>([
  [1, 'health'],
  [2, 'school'],
  [3, 'therapy'],
  [4, 'activity'],
  [5, 'meeting'],
]);

export function eventToneFor(eventTypeId: number): EventTone {
  return TONE_BY_EVENT_TYPE_ID.get(eventTypeId) ?? 'neutral';
}

export function eventToneClassName(eventTypeId: number): string {
  return `event-tone--${eventToneFor(eventTypeId)}`;
}
