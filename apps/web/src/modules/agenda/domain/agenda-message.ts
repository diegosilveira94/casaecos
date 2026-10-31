import type { EventResponse, PersonResponse, PersonSummaryResponse } from '@casaecos/shared-types';

import { isSameDay } from './calendar-dates.js';
import { PARTICIPATION_TYPE_IDS, SHELTERED_ROLE_ID } from './event-form.js';
import { formatTime, groupEventsByDay } from './event-format.js';
import type { SendPeriod } from './send-period.js';

export type AgendaAudience =
  { kind: 'general' } | { kind: 'drivers' } | { kind: 'person'; person: PersonSummaryResponse };

// One color per home id, so a home keeps its heart from one message to the next.
const HOME_HEARTS = ['💛', '💙', '💚', '🧡', '💜', '🤎'];

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const dayMonthFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fullDateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

function nameParts(name: string): string[] {
  return name.trim().split(/\s+/);
}

function firstName(name: string): string {
  return nameParts(name)[0] ?? name;
}

function hasSameStart(parts: string[], otherParts: string[]): boolean {
  return parts.every(
    (part, index) =>
      part.localeCompare(otherParts[index] ?? '', 'pt-BR', { sensitivity: 'base' }) === 0,
  );
}

function joinNames(names: string[]): string {
  const last = names.at(-1);
  if (last === undefined || names.length === 1) return last ?? '';
  return `${names.slice(0, -1).join(', ')} e ${last}`;
}

function greeting(hour: number): string {
  if (hour < 12) return 'Bom dia';
  return hour < 18 ? 'Boa tarde' : 'Boa noite';
}

function upperWeekday(day: Date): string {
  return weekdayFormat.format(day).toLocaleUpperCase('pt-BR');
}

/** The commitments the audience gets. The sidebar home never applies: a driver serves them all. */
export function eventsForAudience(
  events: readonly EventResponse[],
  audience: AgendaAudience,
): EventResponse[] {
  switch (audience.kind) {
    case 'general':
      return [...events];
    case 'drivers':
      return events.filter(({ participants }) =>
        participants.some(
          ({ participationType }) => participationType.id === PARTICIPATION_TYPE_IDS.driver,
        ),
      );
    case 'person':
      return events.filter(({ participants }) =>
        participants.some(({ person }) => person.id === audience.person.id),
      );
  }
}

/** Writes the agenda the way the association already sends it on WhatsApp. */
export class AgendaMessage {
  private readonly shelteredNames: Map<number, string>;

  constructor(
    private readonly audience: AgendaAudience,
    people: readonly PersonResponse[],
  ) {
    this.shelteredNames = new Map(
      people.filter(({ role }) => role.id === SHELTERED_ROLE_ID).map(({ id, name }) => [id, name]),
    );
  }

  /** The text, or null when the period has nothing to send to this audience. */
  build(events: readonly EventResponse[], period: SendPeriod, now: Date): string | null {
    const audienceEvents = eventsForAudience(events, this.audience);
    if (audienceEvents.length === 0) return null;

    const isSingleDay = isSameDay(period.firstDay, period.lastDay);
    const lines = this.headerLines(period, isSingleDay, now);

    for (const dayEvents of groupEventsByDay(audienceEvents).values()) {
      lines.push('');
      if (!isSingleDay) lines.push(this.dayTitle(dayEvents), '');
      lines.push(...this.dayLines(dayEvents));
    }
    return lines.join('\n');
  }

  private headerLines(period: SendPeriod, isSingleDay: boolean, now: Date): string[] {
    const name = this.audience.kind === 'person' ? `, ${firstName(this.audience.person.name)}` : '';
    const title = isSingleDay
      ? `AGENDA DE ${upperWeekday(period.firstDay)} ${fullDateFormat.format(period.firstDay)}`
      : `AGENDA DE ${dayMonthFormat.format(period.firstDay)} A ${dayMonthFormat.format(period.lastDay)}`;
    const lines = [`${greeting(now.getHours())}${name}! 🔴 *${title}*`];
    if (this.audience.kind === 'drivers') lines.push('*MOTORISTAS*');
    return lines;
  }

  private dayTitle(dayEvents: EventResponse[]): string {
    const [firstEvent] = dayEvents;
    const day = new Date(firstEvent?.startDate ?? 0);
    return `*${upperWeekday(day)} ${dayMonthFormat.format(day)}*`;
  }

  private dayLines(dayEvents: EventResponse[]): string[] {
    if (this.audience.kind !== 'general') return this.timeLines(dayEvents);

    const eventsByHome = new Map<number, EventResponse[]>();
    for (const event of dayEvents) {
      eventsByHome.set(event.home.id, [...(eventsByHome.get(event.home.id) ?? []), event]);
    }

    const homeIds = [...eventsByHome.keys()].sort((first, second) => first - second);
    return homeIds.flatMap((homeId, index) => {
      const homeEvents = eventsByHome.get(homeId) ?? [];
      const homeName = homeEvents[0]?.home.name.toLocaleUpperCase('pt-BR') ?? '';
      const heart = HOME_HEARTS[(homeId - 1) % HOME_HEARTS.length] ?? '';
      return [
        ...(index === 0 ? [] : ['']),
        `${heart} *${homeName}*`,
        ...this.timeLines(homeEvents),
      ];
    });
  }

  private timeLines(events: EventResponse[]): string[] {
    const lines: string[] = [];
    let currentTime: string | null = null;

    for (const event of events) {
      const time = formatTime(event.startDate);
      if (time !== currentTime) {
        if (currentTime !== null) lines.push('');
        lines.push(`➡️ Às ${time}`);
        currentTime = time;
      }
      lines.push(...this.eventLines(event));
    }
    return lines;
  }

  private eventLines(event: EventResponse): string[] {
    const lines = [`* ${this.eventSummary(event)}${this.companionNote(event)}`];
    if (event.description !== null) lines.push(event.description);
    if (event.address !== null && this.audience.kind !== 'general') {
      lines.push(`📍 ${event.address}`);
    }
    return lines;
  }

  private eventSummary(event: EventResponse): string {
    const names = joinNames(
      event.participants
        .filter(({ person }) => this.shelteredNames.has(person.id))
        .map(({ person }) => this.shelteredLabel(person.id, person.name)),
    );
    if (names === '') return event.title;
    return this.audience.kind === 'general'
      ? `${names}: ${event.title}`
      : `${event.title}: ${names}`;
  }

  /**
   * First name in capitals, growing only while another sheltered person starts the
   * same way: a caregiver has to know which child, with as little of the name as possible.
   */
  private shelteredLabel(personId: number, name: string): string {
    const parts = nameParts(name);
    const others = [...this.shelteredNames]
      .filter(([id]) => id !== personId)
      .map(([, otherName]) => nameParts(otherName));

    let length = 1;
    while (
      length < parts.length &&
      others.some((otherParts) => hasSameStart(parts.slice(0, length), otherParts))
    ) {
      length += 1;
    }
    return parts.slice(0, length).join(' ').toLocaleUpperCase('pt-BR');
  }

  private companionNote(event: EventResponse): string {
    const companions = event.participants
      .filter(
        ({ participationType }) => participationType.id === PARTICIPATION_TYPE_IDS.responsible,
      )
      .map(({ person }) => this.companionName(person));
    if (companions.length === 0) return '';
    return ` (${joinNames(companions)} ${companions.length === 1 ? 'acompanha' : 'acompanham'})`;
  }

  private companionName(person: PersonSummaryResponse): string {
    const isRecipient = this.audience.kind === 'person' && this.audience.person.id === person.id;
    return isRecipient ? 'você' : firstName(person.name);
  }
}
