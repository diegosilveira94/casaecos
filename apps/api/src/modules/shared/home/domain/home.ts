import type { HomeResponse, OrganizationSummaryResponse } from '@casaecos/shared-types';

import type { Person } from '../../person/domain/person.js';

export class OrganizationSummary {
  constructor(
    readonly id: number,
    readonly name: string,
  ) {}

  toResponse(): OrganizationSummaryResponse {
    return { id: this.id, name: this.name };
  }
}

export interface HomeProperties {
  id: number;
  name: string;
  organization: OrganizationSummary;
  responsible: Person;
  createdAt: Date;
  updatedAt: Date;
}

export class Home {
  readonly id: number;
  readonly name: string;
  readonly organization: OrganizationSummary;
  readonly responsible: Person;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(properties: HomeProperties) {
    this.id = properties.id;
    this.name = properties.name;
    this.organization = properties.organization;
    this.responsible = properties.responsible;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }

  toResponse(): HomeResponse {
    return {
      id: this.id,
      name: this.name,
      organization: this.organization.toResponse(),
      responsible: this.responsible.toResponse(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
