import type {
  ApiMessage,
  CreatePersonRequest,
  HomeResponse,
  PersonResponse,
  RoleResponse,
  UpdatePersonRequest,
} from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import type { HttpClient } from '../../../../shared/http/http-client.js';

const PEOPLE_PATH = '/people';

function personPath(personId: number): string {
  return `${PEOPLE_PATH}/${String(personId)}`;
}

export class PersonService {
  constructor(private readonly http: HttpClient) {}

  /** Everyone, ordered by name: needs `person:read`. */
  list(): Promise<PersonResponse[]> {
    return this.http.get(PEOPLE_PATH);
  }

  /** Everyone with the role, whatever the home: needs `person:read`. */
  listByRole(roleId: number): Promise<PersonResponse[]> {
    return this.http.get(`${PEOPLE_PATH}?roleId=${String(roleId)}`);
  }

  /** The homes the person is linked to (`home_person`). */
  listHomes(personId: number): Promise<HomeResponse[]> {
    return this.http.get(`${personPath(personId)}/homes`);
  }

  listRoles(): Promise<RoleResponse[]> {
    return this.http.get('/roles');
  }

  create(request: CreatePersonRequest): Promise<PersonResponse> {
    return this.http.post(PEOPLE_PATH, request);
  }

  update(personId: number, request: UpdatePersonRequest): Promise<PersonResponse> {
    return this.http.patch(personPath(personId), request);
  }

  /** Refused with 409 while the person is linked to a home or a commitment. */
  delete(personId: number): Promise<ApiMessage> {
    return this.http.delete(personPath(personId));
  }
}

export const personService = new PersonService(apiClient);
