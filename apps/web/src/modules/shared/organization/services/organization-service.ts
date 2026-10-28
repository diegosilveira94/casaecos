import type { OrganizationSummaryResponse } from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import type { HttpClient } from '../../../../shared/http/http-client.js';

export class OrganizationService {
  constructor(private readonly http: HttpClient) {}

  /** The organizations a home can belong to: needs `home:write`. */
  list(): Promise<OrganizationSummaryResponse[]> {
    return this.http.get('/organizations');
  }
}

export const organizationService = new OrganizationService(apiClient);
