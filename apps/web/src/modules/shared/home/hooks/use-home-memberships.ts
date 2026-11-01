import type { HomeResponse, PersonResponse } from '@casaecos/shared-types';

import { useApiResource, type ApiResource } from '../../../../shared/http/use-api-resource.js';
import { homeService } from '../services/home-service.js';

/** Every home in the user's scope with the people linked to it (`home_person`). */
export class HomeMemberships {
  constructor(
    readonly homes: readonly HomeResponse[],
    private readonly peopleByHomeId: ReadonlyMap<number, readonly PersonResponse[]>,
  ) {}

  peopleOf(homeId: number): readonly PersonResponse[] {
    return this.peopleByHomeId.get(homeId) ?? [];
  }

  homesOf(personId: number): HomeResponse[] {
    return this.homes.filter((home) => this.peopleOf(home.id).some(({ id }) => id === personId));
  }
}

// One call per home: an NGO has a handful of them, and the API has no route that
// lists the links of every home at once.
async function loadMemberships(): Promise<HomeMemberships> {
  const homes = await homeService.list();
  const people = await Promise.all(homes.map((home) => homeService.listPeople(home.id)));
  return new HomeMemberships(
    homes,
    new Map(homes.map((home, index) => [home.id, people[index] ?? []])),
  );
}

export function useHomeMemberships(): {
  memberships: ApiResource<HomeMemberships>;
  reload: () => void;
} {
  const { resource, reload } = useApiResource('home-memberships', loadMemberships);
  return { memberships: resource, reload };
}
