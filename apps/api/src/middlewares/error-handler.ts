import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import type { ApiError } from '@casaecos/shared-types';

import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiError = { message: 'Rota não encontrada' };
  res.status(404).json(body);
};

// Express 5 encaminha rejeições de handlers async para cá automaticamente.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    const body: ApiError = { message: err.message };
    if (err.details !== undefined) body.details = err.details;
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiError = { message: 'Dados inválidos', details: err.issues };
    res.status(400).json(body);
    return;
  }

  if (env.NODE_ENV !== 'test') {
    console.error(err);
  }

  const body: ApiError = { message: 'Erro interno do servidor' };
  res.status(500).json(body);
};
