import { prisma } from '../../../../config/prisma.js';
import { OrganizationSummary } from '../domain/organization.js';

export interface OrganizationRepository {
  findAll(): Promise<OrganizationSummary[]>;
}

export class PrismaOrganizationRepository implements OrganizationRepository {
  async findAll(): Promise<OrganizationSummary[]> {
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return organizations.map(({ id, name }) => new OrganizationSummary(id, name));
  }
}
