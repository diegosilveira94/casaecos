import type { RequestHandler } from 'express';

import { HttpError } from '../../../../middlewares/http-error.js';
import { ROLE_NOT_ALLOWED } from '../auth-messages.js';
import type { Permission } from '../domain/permissions.js';

class PermissionMiddleware {
  constructor(private readonly permission: Permission) {}

  readonly handle: RequestHandler = (request, _response, next) => {
    const user = request.user;

    // Missing user means the route skipped authentication, which is a 401 and not
    // a 403: the client needs to know it has to log in first.
    if (!user) {
      next(HttpError.unauthorized());
      return;
    }

    if (!user.can(this.permission)) {
      next(HttpError.forbidden(ROLE_NOT_ALLOWED));
      return;
    }

    next();
  };
}

export function authorize(permission: Permission): RequestHandler {
  return new PermissionMiddleware(permission).handle;
}
