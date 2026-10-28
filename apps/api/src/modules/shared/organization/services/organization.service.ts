import type { OrganizationSummaryResponse } from '@casaecos/shared-types';

import {
  PrismaOrganizationRepository,
  type OrganizationRepository,
} from '../repositories/organization.repository.js';

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async list(): Promise<OrganizationSummaryResponse[]> {
    const organizations = await this.repository.findAll();
    return organizations.map((organization) => organization.toResponse());
  }
}

export const organizationService = new OrganizationService(new PrismaOrganizationRepository());
