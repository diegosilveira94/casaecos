import type { PersonResponse } from '@casaecos/shared-types';

import { homeService, type HomeService } from '../../home/services/home-service.js';
import { homeLinkChanges, toPersonRequest, type PersonFormValues } from '../domain/person-form.js';
import { personService, type PersonService } from './person-service.js';

/**
 * The person was saved, their homes were not. The form keeps `personId` so that
 * trying again updates this person instead of registering them twice.
 */
export class PersonHomesSaveError extends Error {
  constructor(
    readonly personId: number,
    cause: unknown,
  ) {
    super('Person saved without their homes', { cause });
    this.name = 'PersonHomesSaveError';
  }
}

/**
 * Saves what the person form holds. Homes live in `home_person`, with routes of their
 * own, so a save is the person first and then one call per home that changed.
 */
export class PersonFormSaver {
  constructor(
    private readonly people: PersonService,
    private readonly homes: HomeService,
  ) {}

  /** `personId` null registers the person. */
  async save(personId: number | null, values: PersonFormValues): Promise<PersonResponse> {
    const request = toPersonRequest(values);
    const saved =
      personId === null
        ? await this.people.create(request)
        : await this.people.update(personId, request);

    try {
      // Read from the API, not from the form: after a save that failed halfway, only
      // the API knows which links went through.
      const linkedHomeIds =
        personId === null ? [] : (await this.people.listHomes(saved.id)).map(({ id }) => id);
      const { toLink, toUnlink } = homeLinkChanges(linkedHomeIds, values.homeIds);
      for (const homeId of toUnlink) await this.homes.unlinkPerson(homeId, saved.id);
      for (const homeId of toLink) await this.homes.linkPerson(homeId, saved.id);
    } catch (error: unknown) {
      throw new PersonHomesSaveError(saved.id, error);
    }
    return saved;
  }
}

export const personFormSaver = new PersonFormSaver(personService, homeService);
