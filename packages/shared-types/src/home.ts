import type { PersonResponse } from './person.js';

export interface OrganizationSummaryResponse {
  id: number;
  name: string;
}

export interface HomeResponse {
  id: number;
  name: string;
  organization: OrganizationSummaryResponse;
  responsible: PersonResponse;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomeRequest {
  name: string;
  organizationId: number;
  responsibleId: number;
}

export interface UpdateHomeRequest {
  name?: string;
  organizationId?: number;
  responsibleId?: number;
}
