import type { EventResponse, EventTypeResponse } from '@casaecos/shared-types';

import type { ScopedEvent } from '../../shared/auth/domain/access-scope.js';
import type { HomeSummary } from '../../shared/home/domain/home.js';

export class EventType {
  constructor(
    readonly id: number,
    readonly name: string,
  ) {}

  toResponse(): EventTypeResponse {
    return { id: this.id, name: this.name };
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
  participantIds: readonly number[];
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
  /** Read by the access scope (a driver sees the events he takes part in); not exposed until ECOS-7. */
  readonly participantIds: readonly number[];
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
    this.participantIds = properties.participantIds;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }

  get homeId(): number {
    return this.home.id;
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
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
