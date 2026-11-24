import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { ApiMessage } from '@casaecos/shared-types';

import { RequestValidator } from '../../../../middlewares/validate.js';
import { currentUser } from '../../auth/middlewares/authenticate.js';
import { homeService } from '../services/home.service.js';

const idSchema = z.coerce.number().int().positive();
const nameSchema = z.string().trim().min(1).max(100);
const organizationIdSchema = z.number().int().positive();
const responsibleIdSchema = z.number().int().positive();

const homeIdParamsSchema = z.object({ id: idSchema });

const createHomeSchema = z
  .object({
    name: nameSchema,
    organizationId: organizationIdSchema,
    responsibleId: responsibleIdSchema,
  })
  .strict();

const updateHomeSchema = z
  .object({
    name: nameSchema.exactOptional(),
    organizationId: organizationIdSchema.exactOptional(),
    responsibleId: responsibleIdSchema.exactOptional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Informe ao menos um campo' });

const homeFiltersSchema = z.object({
  organizationId: idSchema.exactOptional(),
});

const homePersonParamsSchema = z.object({
  homeId: idSchema,
  personId: idSchema,
});

const homePeopleParamsSchema = z.object({
  homeId: idSchema,
});

const personHomesParamsSchema = z.object({
  personId: idSchema,
});

export class HomeController {
  readonly listValidator = new RequestValidator({ query: homeFiltersSchema });
  readonly homeIdValidator = new RequestValidator({ params: homeIdParamsSchema });
  readonly createValidator = new RequestValidator({ body: createHomeSchema });
  readonly updateValidator = new RequestValidator({
    params: homeIdParamsSchema,
    body: updateHomeSchema,
  });
  readonly homePersonValidator = new RequestValidator({ params: homePersonParamsSchema });
  readonly listPeopleValidator = new RequestValidator({ params: homePeopleParamsSchema });
  readonly listHomesValidator = new RequestValidator({ params: personHomesParamsSchema });

  list: RequestHandler = async (request, response) => {
    const { query } = this.listValidator.data(response);
    response.json(await homeService.list(query, currentUser(request).scope));
  };

  getById: RequestHandler = async (request, response) => {
    const { params } = this.homeIdValidator.data(response);
    response.json(await homeService.getById(params.id, currentUser(request).scope));
  };

  create: RequestHandler = async (_request, response) => {
    const { body } = this.createValidator.data(response);
    response.status(201).json(await homeService.create(body));
  };

  update: RequestHandler = async (_request, response) => {
    const { params, body } = this.updateValidator.data(response);
    response.json(await homeService.update(params.id, body));
  };

  delete: RequestHandler = async (_request, response) => {
    const { params } = this.homeIdValidator.data(response);
    await homeService.delete(params.id);
    const body: ApiMessage = { message: 'Casa excluída com sucesso' };
    response.json(body);
  };

  linkPerson: RequestHandler = async (_request, response) => {
    const { params } = this.homePersonValidator.data(response);
    await homeService.linkPerson(params.homeId, params.personId);
    const body: ApiMessage = { message: 'Pessoa vinculada à casa com sucesso' };
    response.status(201).json(body);
  };

  unlinkPerson: RequestHandler = async (_request, response) => {
    const { params } = this.homePersonValidator.data(response);
    await homeService.unlinkPerson(params.homeId, params.personId);
    const body: ApiMessage = { message: 'Pessoa desvinculada da casa com sucesso' };
    response.json(body);
  };

  listPeople: RequestHandler = async (request, response) => {
    const { params } = this.listPeopleValidator.data(response);
    response.json(await homeService.listPeople(params.homeId, currentUser(request).scope));
  };

  listHomes: RequestHandler = async (_request, response) => {
    const { params } = this.listHomesValidator.data(response);
    response.json(await homeService.listHomes(params.personId));
  };
}

export const homeController = new HomeController();
