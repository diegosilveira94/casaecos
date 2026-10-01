import type { HomeResponse } from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import type { HttpClient } from '../../../../shared/http/http-client.js';

const HOMES_PATH = '/homes';

export class HomeService {
  constructor(private readonly http: HttpClient) {}

  /** Already cut by the user's access scope: a caregiver gets only their homes. */
  list(): Promise<HomeResponse[]> {
    return this.http.get(HOMES_PATH);
  }
}

export const homeService = new HomeService(apiClient);
