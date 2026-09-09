import type { RequestHandler } from 'express';

import { HttpError } from '../../../../middlewares/http-error.js';
import { tokenService } from '../services/token.service.js';

export const requireAuth: RequestHandler = async (request, _response, next) => {
  const authorization = request.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    next(HttpError.unauthorized());
    return;
  }

  try {
    request.auth = await tokenService.verify(token);
    next();
  } catch {
    next(HttpError.unauthorized('Token inválido ou expirado'));
  }
};

export function requireRole(...allowedRoles: string[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(HttpError.unauthorized());
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(HttpError.forbidden());
      return;
    }

    next();
  };
}
