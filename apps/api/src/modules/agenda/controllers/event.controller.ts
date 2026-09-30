import type { RequestHandler } from 'express';
import { z } from 'zod';

import type { ApiMessage } from '@casaecos/shared-types';

import { RequestValidator } from '../../../middlewares/validate.js';
import { paginationQueryShape } from '../../../shared/pagination.js';
import { nullableText } from '../../../shared/text-schemas.js';
import { currentUser } from '../../shared/auth/middlewares/authenticate.js';
import { eventService } from '../services/event.service.js';

// The offset is mandatory: a local time such as `2026-10-01T10:00:00` would be read
// in the server's time zone, the bug timestamptz exists to avoid (decision #27).
const dateTimeSchema = z.iso.datetime({ offset: true });

const titleSchema = z.string().trim().min(1).max(45);
const idSchema = z.number().int().positive();

// Path and query values arrive as strings.
const urlIdSchema = z.coerce.number().int().positive();

const eventIdParamsSchema = z.object({ id: urlIdSchema });

// Strict: a misspelled filter (`start=` instead of `from=`) would otherwise be
// dropped and the listing would silently come back unfiltered.
const listEventsQuerySchema = z
  .object({
    homeId: urlIdSchema.exactOptional(),
    eventTypeId: urlIdSchema.exactOptional(),
    from: dateTimeSchema.exactOptional(),
    to: dateTimeSchema.exactOptional(),
    ...paginationQueryShape,
  })
  .strict()
  .refine(
    ({ from, to }) => from === undefined || to === undefined || new Date(to) > new Date(from),
    { path: ['to'], message: 'O fim do período precisa ser depois do início' },
  );

const createEventSchema = z
  .object({
    title: titleSchema,
    description: nullableText(300).exactOptional(),
    startDate: dateTimeSchema,
    endDate: z.union([dateTimeSchema, z.null()]).exactOptional(),
    address: nullableText(100).exactOptional(),
    eventTypeId: idSchema,
    homeId: idSchema,
  })
  .strict();

// Listed field by field, not `.partial()`: see decision #67.
const updateEventSchema = z
  .object({
    title: titleSchema.exactOptional(),
    description: nullableText(300).exactOptional(),
    startDate: dateTimeSchema.exactOptional(),
    endDate: z.union([dateTimeSchema, z.null()]).exactOptional(),
    address: nullableText(100).exactOptional(),
    eventTypeId: idSchema.exactOptional(),
    homeId: idSchema.exactOptional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Informe ao menos um campo' });

export class EventController {
  readonly listValidator = new RequestValidator({ query: listEventsQuerySchema });
  readonly eventIdValidator = new RequestValidator({ params: eventIdParamsSchema });
  readonly createValidator = new RequestValidator({ body: createEventSchema });
  readonly updateValidator = new RequestValidator({
    params: eventIdParamsSchema,
    body: updateEventSchema,
  });

  list: RequestHandler = async (request, response) => {
    const { query } = this.listValidator.data(response);
    response.json(await eventService.list(query, currentUser(request).scope));
  };

  listEventTypes: RequestHandler = async (_request, response) => {
    response.json(await eventService.listEventTypes());
  };

  getById: RequestHandler = async (request, response) => {
    const { params } = this.eventIdValidator.data(response);
    response.json(await eventService.getById(params.id, currentUser(request).scope));
  };

  create: RequestHandler = async (request, response) => {
    const { body } = this.createValidator.data(response);
    response.status(201).json(await eventService.create(body, currentUser(request).scope));
  };

  update: RequestHandler = async (request, response) => {
    const { params, body } = this.updateValidator.data(response);
    response.json(await eventService.update(params.id, body, currentUser(request).scope));
  };

  delete: RequestHandler = async (request, response) => {
    const { params } = this.eventIdValidator.data(response);
    await eventService.delete(params.id, currentUser(request).scope);
    const body: ApiMessage = { message: 'Compromisso excluído com sucesso' };
    response.json(body);
  };
}

export const eventController = new EventController();
