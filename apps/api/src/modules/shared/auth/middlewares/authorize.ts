import type { RequestHandler } from 'express';

import { HttpError } from '../../../../middlewares/http-error.js';
import { ROLE_NOT_ALLOWED } from '../auth-messages.js';

class RoleAuthorizationMiddleware {
  private readonly allowedRoleIds: ReadonlySet<number>;

  constructor(allowedRoleIds: readonly number[]) {
    this.allowedRoleIds = new Set(allowedRoleIds);
  }

  readonly handle: RequestHandler = (request, _response, next) => {
    const user = request.user;

    // Missing user means the route skipped authentication, which is a 401 and not
    // a 403: the client needs to know it has to log in first.
    if (!user) {
      next(HttpError.unauthorized());
      return;
    }

    if (!this.allowedRoleIds.has(user.role.id)) {
      next(HttpError.forbidden(ROLE_NOT_ALLOWED));
      return;
    }

    next();
  };
}

/**
 * Role gate, to be registered after `authenticate`. Seed of the ECOS-14 RBAC: it
 * only filters by role, while the house scope (`home_person`) belongs there.
 */
export function authorizeRoles(...allowedRoleIds: number[]): RequestHandler {
  return new RoleAuthorizationMiddleware(allowedRoleIds).handle;
}
