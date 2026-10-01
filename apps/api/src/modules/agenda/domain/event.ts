import type {
  EventParticipantResponse,
  EventResponse,
  EventTypeResponse,
  ParticipationTypeResponse,
} from '@casaecos/shared-types';

import type { ScopedEvent } from '../../shared/auth/domain/access-scope.js';
import type { HomeSummary } from '../../shared/home/domain/home.js';
import type { PersonSummary } from '../../shared/person/domain/person.js';

export class EventType {
  constructor(
    readonly id: number,
    readonly name: string,
  ) {}

  toResponse(): EventTypeResponse {
    return { id: this.id, name: this.name };
  }
}

export class ParticipationType {
  constructor(
    readonly id: number,
    readonly description: string,
  ) {}

  toResponse(): ParticipationTypeResponse {
    return { id: this.id, description: this.description };
  }
}

export class EventParticipant {
  constructor(
    readonly person: PersonSummary,
    readonly participationType: ParticipationType,
  ) {}

  toResponse(): EventParticipantResponse {
    return {
      person: this.person.toResponse(),
      participationType: this.participationType.toResponse(),
    };
  }
}

export interface EventProperties {
  id: number;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  address: string | null;
  eventType: EventType;
  home: HomeSummary;
  participants: readonly EventParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

export class Event implements ScopedEvent {
  readonly id: number;
  readonly title: string;
  readonly description: string | null;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly address: string | null;
  readonly eventType: EventType;
  readonly home: HomeSummary;
  readonly participants: readonly EventParticipant[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(properties: EventProperties) {
    this.id = properties.id;
    this.title = properties.title;
    this.description = properties.description;
    this.startDate = properties.startDate;
    this.endDate = properties.endDate;
    this.address = properties.address;
    this.eventType = properties.eventType;
    this.home = properties.home;
    this.participants = properties.participants;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }

  get homeId(): number {
    return this.home.id;
  }

  get participantIds(): readonly number[] {
    return this.participants.map((participant) => participant.person.id);
  }

  hasParticipant(personId: number): boolean {
    return this.participantIds.includes(personId);
  }

  toResponse(): EventResponse {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate?.toISOString() ?? null,
      address: this.address,
      eventType: this.eventType.toResponse(),
      home: this.home.toResponse(),
      participants: this.participants.map((participant) => participant.toResponse()),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
