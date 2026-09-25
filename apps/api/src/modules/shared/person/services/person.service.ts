import type {
  CreatePersonRequest,
  PersonResponse,
  RoleResponse,
  UpdatePersonRequest,
} from '@casaecos/shared-types';

import { HttpError } from '../../../../middlewares/http-error.js';
import { ACCESS_MANAGEMENT_NOT_ALLOWED } from '../../auth/auth-messages.js';
import type { AuthenticatedUser } from '../../auth/domain/user-account.js';
import { ROLE_IDS } from '../domain/role-ids.js';
import {
  DuplicatePhoneError,
  PrismaPersonRepository,
  type CreatePersonData,
  type PersonFilters,
  type PersonRepository,
  type UpdatePersonData,
} from '../repositories/person.repository.js';

const PHONE_IN_USE_MESSAGE = 'Este telefone já está em uso';

function normalizeOptionalValue(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) return null;
  return normalizedValue;
}

export class PersonService {
  constructor(private readonly repository: PersonRepository) {}

  async list(filters: PersonFilters): Promise<PersonResponse[]> {
    const people = await this.repository.findAll(filters);
    return people.map((person) => person.toResponse());
  }

  async getById(id: number): Promise<PersonResponse> {
    const person = await this.repository.findById(id);
    if (!person) throw HttpError.notFound('Pessoa não encontrada');
    return person.toResponse();
  }

  async create(request: CreatePersonRequest, actor: AuthenticatedUser): Promise<PersonResponse> {
    if (request.roleId === ROLE_IDS.coordinator) this.ensureCanManageAccess(actor);
    await this.ensureRoleExists(request.roleId);

    const phone = normalizeOptionalValue(request.phone) ?? null;
    await this.ensurePhoneAvailable(phone);

    const data: CreatePersonData = {
      name: request.name.trim(),
      roleId: request.roleId,
      individualRegistration: normalizeOptionalValue(request.individualRegistration) ?? null,
      phone,
    };

    try {
      return (await this.repository.create(data)).toResponse();
    } catch (error: unknown) {
      this.handlePersistenceError(error);
    }
  }

  async update(
    id: number,
    request: UpdatePersonRequest,
    actor: AuthenticatedUser,
  ): Promise<PersonResponse> {
    const person = await this.repository.findById(id);
    if (!person) throw HttpError.notFound('Pessoa não encontrada');

    if (request.roleId !== undefined && request.roleId !== person.role.id) {
      await this.ensureCanChangeRole(actor, id, request.roleId);
    }

    if (request.roleId !== undefined) await this.ensureRoleExists(request.roleId);

    const data: UpdatePersonData = {};
    if (request.name !== undefined) data.name = request.name.trim();
    if (request.roleId !== undefined) data.roleId = request.roleId;
    if (request.individualRegistration !== undefined) {
      data.individualRegistration = normalizeOptionalValue(request.individualRegistration) ?? null;
    }
    if (request.phone !== undefined) {
      data.phone = normalizeOptionalValue(request.phone) ?? null;
      await this.ensurePhoneAvailable(data.phone, id);
    }

    try {
      return (await this.repository.update(id, data)).toResponse();
    } catch (error: unknown) {
      this.handlePersistenceError(error);
    }
  }

  async delete(id: number, actor: AuthenticatedUser): Promise<void> {
    const links = await this.repository.findLinks(id);
    if (!links) throw HttpError.notFound('Pessoa não encontrada');
    if (links.account) this.ensureCanManageAccess(actor);

    const linkedResources = [
      ...(links.events ? ['eventos'] : []),
      ...(links.homes ? ['casas'] : []),
    ];

    if (linkedResources.length > 0) {
      throw HttpError.conflict('Não é possível excluir uma pessoa vinculada a eventos ou casas', {
        linkedResources,
      });
    }

    await this.repository.delete(id);
  }

  async listRoles(): Promise<RoleResponse[]> {
    const roles = await this.repository.listRoles();
    return roles.map((role) => role.toResponse());
  }

  private async ensureCanChangeRole(
    actor: AuthenticatedUser,
    personId: number,
    newRoleId: number,
  ): Promise<void> {
    const grantsCoordination = newRoleId === ROLE_IDS.coordinator;
    if (grantsCoordination || (await this.personHasAccount(personId))) {
      this.ensureCanManageAccess(actor);
    }
  }

  private ensureCanManageAccess(actor: AuthenticatedUser): void {
    if (!actor.can('account:manage')) throw HttpError.forbidden(ACCESS_MANAGEMENT_NOT_ALLOWED);
  }

  private async personHasAccount(personId: number): Promise<boolean> {
    return (await this.repository.findLinks(personId))?.account === true;
  }

  private async ensureRoleExists(roleId: number): Promise<void> {
    if (!(await this.repository.roleExists(roleId))) {
      throw HttpError.badRequest('Papel informado não existe');
    }
  }

  private async ensurePhoneAvailable(
    phone: string | null,
    excludedPersonId?: number,
  ): Promise<void> {
    if (phone && (await this.repository.phoneExists(phone, excludedPersonId))) {
      throw HttpError.conflict(PHONE_IN_USE_MESSAGE);
    }
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof DuplicatePhoneError) {
      throw HttpError.conflict(PHONE_IN_USE_MESSAGE);
    }
    throw error;
  }
}

export const personService = new PersonService(new PrismaPersonRepository());
