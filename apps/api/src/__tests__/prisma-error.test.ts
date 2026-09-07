import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { Prisma } from '../generated/prisma/client.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { toHttpError } from '../shared/prisma-error.js';

function knownError(code: string, meta: Record<string, unknown> = {}): Error {
  return new Prisma.PrismaClientKnownRequestError('erro do prisma', {
    code,
    clientVersion: '7.0.0',
    meta,
  });
}

describe('toHttpError', () => {
  it('traduz violação de unicidade para 409 nomeando o campo', () => {
    const httpError = toHttpError(knownError('P2002', { target: ['email'] }));

    expect(httpError?.status).toBe(409);
    expect(httpError?.message).toBe('Já existe um registro com este e-mail');
  });

  it('traduz violação de FK para 400', () => {
    expect(toHttpError(knownError('P2003'))?.status).toBe(400);
  });

  it('traduz registro inexistente para 404', () => {
    const httpError = toHttpError(knownError('P2025'));

    expect(httpError?.status).toBe(404);
    expect(httpError?.message).toBe('Recurso não encontrado');
  });

  it('devolve null para código do Prisma sem tradução', () => {
    expect(toHttpError(knownError('P2034'))).toBeNull();
  });

  it('devolve null para erro que não é do Prisma', () => {
    expect(toHttpError(new Error('qualquer coisa'))).toBeNull();
  });
});

describe('errorHandler com erro do Prisma', () => {
  function createTestApp(error: unknown): Express {
    const app = express();

    app.get('/falha', () => {
      throw error;
    });

    app.use(errorHandler);
    return app;
  }

  it('responde 409 no envelope de erro quando o Prisma acusa duplicidade', async () => {
    const app = createTestApp(knownError('P2002', { target: ['email'] }));

    const response = await request(app).get('/falha');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: 'Já existe um registro com este e-mail' });
  });

  it('responde 500 genérico quando o erro não tem tradução', async () => {
    const app = createTestApp(new Error('estourou'));

    const response = await request(app).get('/falha');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Erro interno do servidor' });
  });
});
