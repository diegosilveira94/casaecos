/** Color family of a commitment, named after the seeded `event_type` it stands for. */
export type EventTone = 'health' | 'school' | 'therapy' | 'activity' | 'meeting' | 'neutral';

export interface ToneColors {
  /** Passes 4.5:1 as text on white, since the type name is written in it. */
  color: string;
  /** Background of blocks and selected cards. */
  tint: string;
}

const COLORS_BY_TONE: Record<EventTone, ToneColors> = {
  health: { color: '#186949', tint: '#e3f2e8' },
  school: { color: '#8a5a0b', tint: '#fdf1d8' },
  therapy: { color: '#2463a6', tint: '#e3eefb' },
  activity: { color: '#b03e26', tint: '#fce7e3' },
  meeting: { color: '#6b46b0', tint: '#eee7fa' },
  neutral: { color: '#65716c', tint: '#eef1ef' },
};

// Lookup ids are fixed by the seed (#37), so the color can follow the id. A type
// added later shows up neutral until it gets a color here.
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

export function toneColors(tone: EventTone): ToneColors {
  return COLORS_BY_TONE[tone];
}

export function eventColors(eventTypeId: number): ToneColors {
  return toneColors(eventToneFor(eventTypeId));
}
