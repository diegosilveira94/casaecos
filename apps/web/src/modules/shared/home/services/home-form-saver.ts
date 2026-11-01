import type { HomeResponse } from '@casaecos/shared-types';

import { homeService, type HomeService } from './home-service.js';

export interface HomeFormValues {
  name: string;
  responsibleId: number;
  organizationId: number;
}

/**
 * The home was saved, its responsible was not linked to it. The form has nothing to
 * retry: the home detail lists who is linked, and "Adicionar pessoas" fixes it.
 */
export class HomeResponsibleLinkError extends Error {
  constructor(
    readonly home: HomeResponse,
    cause: unknown,
  ) {
    super('Home saved without linking its responsible', { cause });
    this.name = 'HomeResponsibleLinkError';
  }
}

/**
 * Saves a home and links its responsible to it (`home_person`): the access scope of a
 * caregiver comes from that link, so a responsible left out would not see the home.
 */
export class HomeFormSaver {
  constructor(private readonly homes: HomeService) {}

  /** `homeId` null creates the home; `memberIds` are the people already linked to it. */
  async save(
    homeId: number | null,
    values: HomeFormValues,
    memberIds: readonly number[],
  ): Promise<HomeResponse> {
    const request = { name: values.name.trim(), responsibleId: values.responsibleId };
    const saved =
      homeId === null
        ? await this.homes.create({ ...request, organizationId: values.organizationId })
        : await this.homes.update(homeId, request);

    if (!memberIds.includes(values.responsibleId)) {
      try {
        await this.homes.linkPerson(saved.id, values.responsibleId);
      } catch (error: unknown) {
        throw new HomeResponsibleLinkError(saved, error);
      }
    }
    return saved;
  }
}

export const homeFormSaver = new HomeFormSaver(homeService);
