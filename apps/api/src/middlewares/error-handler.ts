import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import type { ApiError } from '@casaecos/shared-types';

import { env } from '../config/env.js';
import { toHttpError } from '../shared/prisma-error.js';
import { HttpError } from './http-error.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiError = { message: 'Rota não encontrada' };
  res.status(404).json(body);
};

// Express 5 encaminha rejeições de handlers async para cá automaticamente.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const body: ApiError = { message: 'Dados inválidos', details: err.issues };
    res.status(400).json(body);
    return;
  }

  const httpError = err instanceof HttpError ? err : toHttpError(err);

  if (httpError) {
    const body: ApiError = { message: httpError.message };
    if (httpError.details !== undefined) body.details = httpError.details;
    res.status(httpError.status).json(body);
    return;
  }

  if (env.NODE_ENV !== 'test') {
    console.error(err);
  }

  const body: ApiError = { message: 'Erro interno do servidor' };
  res.status(500).json(body);
};
