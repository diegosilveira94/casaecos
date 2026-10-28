import type { OrganizationSummaryResponse } from '@casaecos/shared-types';

/** The NGO a home belongs to. Today there is one, but the schema keeps room for more. */
export class OrganizationSummary {
  constructor(
    readonly id: number,
    readonly name: string,
  ) {}

  toResponse(): OrganizationSummaryResponse {
    return { id: this.id, name: this.name };
  }
}
