import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { CreatePersonRequest, UpdatePersonRequest } from '@casaecos/shared-types';

import type { PersonFilters } from '../repositories/person.repository.js';
import { personService } from '../services/person.service.js';

const idSchema = z.coerce.number().int().positive();

const nullableOptionalText = (maximumLength: number) =>
  z.union([z.string().trim().max(maximumLength), z.null()]).optional();

const createPersonSchema = z
  .object({
    name: z.string().trim().min(1).max(45),
    roleId: z.number().int().positive(),
    individualRegistration: nullableOptionalText(14),
    phone: nullableOptionalText(20),
  })
  .strict();

const updatePersonSchema = createPersonSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Informe ao menos um campo' });

const personFiltersSchema = z.object({
  roleId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(45).optional(),
});

export class PersonController {
  list: RequestHandler = async (request, response) => {
    const query = personFiltersSchema.parse(request.query);
    const filters: PersonFilters = {
      ...(query.roleId === undefined ? {} : { roleId: query.roleId }),
      ...(query.name === undefined ? {} : { name: query.name }),
    };
    response.json(await personService.list(filters));
  };

  getById: RequestHandler = async (request, response) => {
    const id = idSchema.parse(request.params.id);
    response.json(await personService.getById(id));
  };

  create: RequestHandler = async (request, response) => {
    const parsedBody = createPersonSchema.parse(request.body);
    const body: CreatePersonRequest = {
      name: parsedBody.name,
      roleId: parsedBody.roleId,
      ...(parsedBody.individualRegistration === undefined
        ? {}
        : { individualRegistration: parsedBody.individualRegistration }),
      ...(parsedBody.phone === undefined ? {} : { phone: parsedBody.phone }),
    };
    response.status(201).json(await personService.create(body));
  };

  update: RequestHandler = async (request, response) => {
    const id = idSchema.parse(request.params.id);
    const parsedBody = updatePersonSchema.parse(request.body);
    const body: UpdatePersonRequest = {
      ...(parsedBody.name === undefined ? {} : { name: parsedBody.name }),
      ...(parsedBody.roleId === undefined ? {} : { roleId: parsedBody.roleId }),
      ...(parsedBody.individualRegistration === undefined
        ? {}
        : { individualRegistration: parsedBody.individualRegistration }),
      ...(parsedBody.phone === undefined ? {} : { phone: parsedBody.phone }),
    };
    response.json(await personService.update(id, body));
  };

  delete: RequestHandler = async (request, response) => {
    const id = idSchema.parse(request.params.id);
    await personService.delete(id);
    response.status(204).send();
  };

  listRoles: RequestHandler = async (_request, response) => {
    response.json(await personService.listRoles());
  };
}

export const personController = new PersonController();
