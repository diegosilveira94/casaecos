import type { PersonResponse } from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import type { HttpClient } from '../../../../shared/http/http-client.js';

const PEOPLE_PATH = '/people';

export class PersonService {
  constructor(private readonly http: HttpClient) {}

  /** Everyone with the role, whatever the home: needs `person:read`. */
  listByRole(roleId: number): Promise<PersonResponse[]> {
    return this.http.get(`${PEOPLE_PATH}?roleId=${String(roleId)}`);
  }
}

export const personService = new PersonService(apiClient);
