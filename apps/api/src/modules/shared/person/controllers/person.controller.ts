import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { ApiMessage } from '@casaecos/shared-types';

import { RequestValidator } from '../../../../middlewares/validate.js';
import { personService } from '../services/person.service.js';

// Optional fields use exactOptional: the output is `field?: T` without `| undefined`,
// which is what the DTOs require under exactOptionalPropertyTypes. JSON and query
// strings never carry an explicit `undefined`, so the accepted input is unchanged.
const nameSchema = z.string().trim().min(1).max(45);
const roleIdSchema = z.number().int().positive();

const nullableText = (maximumLength: number) =>
  z.union([z.string().trim().max(maximumLength), z.null()]);

const personIdParamsSchema = z.object({ id: z.coerce.number().int().positive() });

const createPersonSchema = z
  .object({
    name: nameSchema,
    roleId: roleIdSchema,
    individualRegistration: nullableText(14).exactOptional(),
    phone: nullableText(20).exactOptional(),
  })
  .strict();

// Fields listed one by one instead of `createPersonSchema.partial()`: partial wraps
// each field in a plain optional and brings `| undefined` back to the output.
const updatePersonSchema = z
  .object({
    name: nameSchema.exactOptional(),
    roleId: roleIdSchema.exactOptional(),
    individualRegistration: nullableText(14).exactOptional(),
    phone: nullableText(20).exactOptional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Informe ao menos um campo' });

const personFiltersSchema = z.object({
  roleId: z.coerce.number().int().positive().exactOptional(),
  name: nameSchema.exactOptional(),
});

export class PersonController {
  readonly listValidator = new RequestValidator({ query: personFiltersSchema });
  readonly personIdValidator = new RequestValidator({ params: personIdParamsSchema });
  readonly createValidator = new RequestValidator({ body: createPersonSchema });
  readonly updateValidator = new RequestValidator({
    params: personIdParamsSchema,
    body: updatePersonSchema,
  });

  list: RequestHandler = async (_request, response) => {
    const { query } = this.listValidator.data(response);
    response.json(await personService.list(query));
  };

  getById: RequestHandler = async (_request, response) => {
    const { params } = this.personIdValidator.data(response);
    response.json(await personService.getById(params.id));
  };

  create: RequestHandler = async (_request, response) => {
    const { body } = this.createValidator.data(response);
    response.status(201).json(await personService.create(body));
  };

  update: RequestHandler = async (_request, response) => {
    const { params, body } = this.updateValidator.data(response);
    response.json(await personService.update(params.id, body));
  };

  delete: RequestHandler = async (_request, response) => {
    const { params } = this.personIdValidator.data(response);
    await personService.delete(params.id);
    const body: ApiMessage = { message: 'Pessoa excluída com sucesso' };
    response.json(body);
  };

  listRoles: RequestHandler = async (_request, response) => {
    response.json(await personService.listRoles());
  };
}

export const personController = new PersonController();
