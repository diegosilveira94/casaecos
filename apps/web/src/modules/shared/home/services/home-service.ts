import type {
  ApiMessage,
  CreateHomeRequest,
  HomeResponse,
  PersonResponse,
  UpdateHomeRequest,
} from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import type { HttpClient } from '../../../../shared/http/http-client.js';

const HOMES_PATH = '/homes';

function homePath(homeId: number): string {
  return `${HOMES_PATH}/${String(homeId)}`;
}

function homePersonPath(homeId: number, personId: number): string {
  return `${homePath(homeId)}/people/${String(personId)}`;
}

export class HomeService {
  constructor(private readonly http: HttpClient) {}

  /** Already cut by the user's access scope: a caregiver gets only their homes. */
  list(): Promise<HomeResponse[]> {
    return this.http.get(HOMES_PATH);
  }

  get(homeId: number): Promise<HomeResponse> {
    return this.http.get(homePath(homeId));
  }

  create(request: CreateHomeRequest): Promise<HomeResponse> {
    return this.http.post(HOMES_PATH, request);
  }

  update(homeId: number, request: UpdateHomeRequest): Promise<HomeResponse> {
    return this.http.patch(homePath(homeId), request);
  }

  /** Refused with 409 while the home has commitments in the agenda. */
  delete(homeId: number): Promise<ApiMessage> {
    return this.http.delete(homePath(homeId));
  }

  /** Everyone linked to the home (`home_person`): sheltered children, caregivers, staff. */
  listPeople(homeId: number): Promise<PersonResponse[]> {
    return this.http.get(`${homePath(homeId)}/people`);
  }

  /** 409 when the person is already linked to the home. */
  linkPerson(homeId: number, personId: number): Promise<ApiMessage> {
    return this.http.post(homePersonPath(homeId, personId), undefined);
  }

  unlinkPerson(homeId: number, personId: number): Promise<ApiMessage> {
    return this.http.delete(homePersonPath(homeId, personId));
  }
}

export const homeService = new HomeService(apiClient);
