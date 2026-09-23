import type { RequestHandler } from 'express';

import { HttpError } from '../../../../middlewares/http-error.js';

/**
 * Gate por papel. É a semente do RBAC da ECOS-14: aqui só barra por `role_id`,
 * o escopo por casa (`home_person`, decisão #28) entra lá.
 *
 * Sempre depois do `AuthenticationMiddleware`: sem usuário na requisição a
 * resposta é 401, não 403 — o cliente precisa saber que falta autenticar.
 */
export class RoleAuthorizationMiddleware {
  private readonly allowedRoleIds: ReadonlySet<number>;

  constructor(allowedRoleIds: readonly number[]) {
    this.allowedRoleIds = new Set(allowedRoleIds);
  }

  readonly handle: RequestHandler = (request, _response, next) => {
    const user = request.user;

    if (!user) {
      next(HttpError.unauthorized());
      return;
    }

    if (!this.allowedRoleIds.has(user.role.id)) {
      next(HttpError.forbidden('Seu papel não permite esta ação'));
      return;
    }

    next();
  };
}

export function authorizeRoles(...allowedRoleIds: number[]): RequestHandler {
  return new RoleAuthorizationMiddleware(allowedRoleIds).handle;
}
