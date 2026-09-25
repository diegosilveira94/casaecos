import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { ApiMessage, CreateHomeRequest, UpdateHomeRequest } from '@casaecos/shared-types';

import { currentUser } from '../../auth/middlewares/authenticate.js';
import type { HomeFilters } from '../repositories/home.repository.js';
import { homeService } from '../services/home.service.js';

const idSchema = z.coerce.number().int().positive();

const createHomeSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    organizationId: z.number().int().positive(),
    responsibleId: z.number().int().positive(),
  })
  .strict();

const updateHomeSchema = createHomeSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Informe ao menos um campo' });

const homeFiltersSchema = z.object({
  organizationId: z.coerce.number().int().positive().optional(),
});

const homePersonParamsSchema = z.object({
  homeId: idSchema,
  personId: idSchema,
});

export class HomeController {
  list: RequestHandler = async (request, response) => {
    const query = homeFiltersSchema.parse(request.query);
    const filters: HomeFilters = {
      ...(query.organizationId === undefined ? {} : { organizationId: query.organizationId }),
    };
    response.json(await homeService.list(filters, currentUser(request).scope));
  };

  getById: RequestHandler = async (request, response) => {
    const id = idSchema.parse(request.params.id);
    response.json(await homeService.getById(id, currentUser(request).scope));
  };

  create: RequestHandler = async (request, response) => {
    const body: CreateHomeRequest = createHomeSchema.parse(request.body);
    response.status(201).json(await homeService.create(body));
  };

  update: RequestHandler = async (request, response) => {
    const id = idSchema.parse(request.params.id);
    const parsedBody = updateHomeSchema.parse(request.body);
    const body: UpdateHomeRequest = {
      ...(parsedBody.name === undefined ? {} : { name: parsedBody.name }),
      ...(parsedBody.organizationId === undefined
        ? {}
        : { organizationId: parsedBody.organizationId }),
      ...(parsedBody.responsibleId === undefined
        ? {}
        : { responsibleId: parsedBody.responsibleId }),
    };
    response.json(await homeService.update(id, body));
  };

  delete: RequestHandler = async (request, response) => {
    const id = idSchema.parse(request.params.id);
    await homeService.delete(id);
    const body: ApiMessage = { message: 'Casa excluída com sucesso' };
    response.json(body);
  };

  linkPerson: RequestHandler = async (request, response) => {
    const { homeId, personId } = homePersonParamsSchema.parse(request.params);
    await homeService.linkPerson(homeId, personId);
    const body: ApiMessage = { message: 'Pessoa vinculada à casa com sucesso' };
    response.status(201).json(body);
  };

  unlinkPerson: RequestHandler = async (request, response) => {
    const { homeId, personId } = homePersonParamsSchema.parse(request.params);
    await homeService.unlinkPerson(homeId, personId);
    const body: ApiMessage = { message: 'Pessoa desvinculada da casa com sucesso' };
    response.json(body);
  };

  listPeople: RequestHandler = async (request, response) => {
    const homeId = idSchema.parse(request.params.homeId);
    response.json(await homeService.listPeople(homeId, currentUser(request).scope));
  };

  listHomes: RequestHandler = async (request, response) => {
    const personId = idSchema.parse(request.params.personId);
    response.json(await homeService.listHomes(personId));
  };
}

export const homeController = new HomeController();
