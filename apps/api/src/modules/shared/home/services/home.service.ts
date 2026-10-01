import type {
  CreateHomeRequest,
  HomeResponse,
  PersonResponse,
  UpdateHomeRequest,
} from '@casaecos/shared-types';

import { HttpError } from '../../../../middlewares/http-error.js';
import type { AccessScope } from '../../auth/domain/access-scope.js';
import {
  DuplicateHomePersonError,
  HomeHasEventsError,
  PrismaHomeRepository,
  type CreateHomeData,
  type HomeFilters,
  type HomeRepository,
  type UpdateHomeData,
} from '../repositories/home.repository.js';

const HOME_HAS_EVENTS_MESSAGE = 'Não é possível excluir uma casa com eventos vinculados';

export class HomeService {
  constructor(private readonly repository: HomeRepository) {}

  async list(filters: HomeFilters, scope: AccessScope): Promise<HomeResponse[]> {
    const accessibleHomeIds = scope.accessibleHomeIds();
    const scopedFilters: HomeFilters =
      accessibleHomeIds === null ? filters : { ...filters, ids: accessibleHomeIds };
    const homes = await this.repository.findAll(scopedFilters);
    return homes.map((home) => home.toResponse());
  }

  async getById(id: number, scope: AccessScope): Promise<HomeResponse> {
    scope.assertCanAccessHome(id);
    const home = await this.repository.findById(id);
    if (!home) throw HttpError.notFound('Casa não encontrada');
    return home.toResponse();
  }

  async create(request: CreateHomeRequest): Promise<HomeResponse> {
    await Promise.all([
      this.ensureOrganizationExists(request.organizationId),
      this.ensureResponsibleExists(request.responsibleId),
    ]);

    const data: CreateHomeData = {
      name: request.name.trim(),
      organizationId: request.organizationId,
      responsibleId: request.responsibleId,
    };
    return (await this.repository.create(data)).toResponse();
  }

  async update(id: number, request: UpdateHomeRequest): Promise<HomeResponse> {
    if (!(await this.repository.findById(id))) throw HttpError.notFound('Casa não encontrada');

    const validations: Promise<void>[] = [];
    if (request.organizationId !== undefined) {
      validations.push(this.ensureOrganizationExists(request.organizationId));
    }
    if (request.responsibleId !== undefined) {
      validations.push(this.ensureResponsibleExists(request.responsibleId));
    }
    await Promise.all(validations);

    const data: UpdateHomeData = {};
    if (request.name !== undefined) data.name = request.name.trim();
    if (request.organizationId !== undefined) data.organizationId = request.organizationId;
    if (request.responsibleId !== undefined) data.responsibleId = request.responsibleId;

    return (await this.repository.update(id, data)).toResponse();
  }

  async delete(id: number): Promise<void> {
    const hasEvents = await this.repository.hasEvents(id);
    if (hasEvents === null) throw HttpError.notFound('Casa não encontrada');
    if (hasEvents) throw HttpError.conflict(HOME_HAS_EVENTS_MESSAGE);

    try {
      await this.repository.delete(id);
    } catch (error: unknown) {
      if (error instanceof HomeHasEventsError) throw HttpError.conflict(HOME_HAS_EVENTS_MESSAGE);
      throw error;
    }
  }

  async linkPerson(homeId: number, personId: number): Promise<void> {
    await Promise.all([this.ensureHomeExists(homeId), this.ensurePersonExists(personId)]);

    try {
      await this.repository.linkPerson(homeId, personId);
    } catch (error: unknown) {
      if (error instanceof DuplicateHomePersonError) {
        throw HttpError.conflict('Pessoa já está vinculada a esta casa');
      }
      throw error;
    }
  }

  async unlinkPerson(homeId: number, personId: number): Promise<void> {
    await Promise.all([this.ensureHomeExists(homeId), this.ensurePersonExists(personId)]);

    if (!(await this.repository.unlinkPerson(homeId, personId))) {
      throw HttpError.notFound('Vínculo entre pessoa e casa não encontrado');
    }
  }

  async listPeople(homeId: number, scope: AccessScope): Promise<PersonResponse[]> {
    scope.assertCanAccessHome(homeId);
    await this.ensureHomeExists(homeId);
    return (await this.repository.listPeople(homeId)).map((person) => person.toResponse());
  }

  async listHomes(personId: number): Promise<HomeResponse[]> {
    await this.ensurePersonExists(personId);
    return (await this.repository.listHomes(personId)).map((home) => home.toResponse());
  }

  private async ensureHomeExists(homeId: number): Promise<void> {
    if (!(await this.repository.findById(homeId))) throw HttpError.notFound('Casa não encontrada');
  }

  private async ensureOrganizationExists(organizationId: number): Promise<void> {
    if (!(await this.repository.organizationExists(organizationId))) {
      throw HttpError.badRequest('Organização informada não existe');
    }
  }

  private async ensureResponsibleExists(personId: number): Promise<void> {
    if (!(await this.repository.personExists(personId))) {
      throw HttpError.badRequest('Responsável informado não existe');
    }
  }

  private async ensurePersonExists(personId: number): Promise<void> {
    if (!(await this.repository.personExists(personId))) {
      throw HttpError.notFound('Pessoa não encontrada');
    }
  }
}

export const homeService = new HomeService(new PrismaHomeRepository());
