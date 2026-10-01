import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ApiError } from '@casaecos/shared-types';

import { errorHandler } from '../middlewares/error-handler.js';
import { RequestValidator } from '../middlewares/validate.js';

const createEventValidator = new RequestValidator({
  body: z.object({ title: z.string().min(1), homeId: z.coerce.number().int().positive() }),
});

const listEventsValidator = new RequestValidator({
  params: z.object({ homeId: z.coerce.number().int().positive() }),
  query: z.object({ page: z.coerce.number().int().positive().default(1) }),
});

function createTestApp(): Express {
  const app = express();
  app.use(express.json());

  app.post('/events', createEventValidator.handle, (_req, res) => {
    const { body } = createEventValidator.data(res);
    res.status(201).json({ title: body.title, homeId: body.homeId });
  });

  app.get('/homes/:homeId/events', listEventsValidator.handle, (_req, res) => {
    const { params, query } = listEventsValidator.data(res);
    res.json({ items: [], page: query.page, pageSize: 20, total: 0, homeId: params.homeId });
  });

  app.use(errorHandler);
  return app;
}

describe('RequestValidator', () => {
  it('entrega o body já convertido para o handler', async () => {
    const response = await request(createTestApp())
      .post('/events')
      .send({ title: 'Consulta', homeId: '3' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ title: 'Consulta', homeId: 3 });
  });

  it('responde 400 com as issues quando o body é inválido', async () => {
    const response = await request(createTestApp()).post('/events').send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
    expect((response.body as ApiError).details).toHaveLength(2);
  });

  it('valida params e query, aplicando o default declarado', async () => {
    const response = await request(createTestApp()).get('/homes/7/events');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ homeId: 7, page: 1 });
  });

  it('responde 400 quando a query não bate com o schema', async () => {
    const response = await request(createTestApp()).get('/homes/7/events?page=zero');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });
});
