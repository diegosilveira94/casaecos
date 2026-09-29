import type { RequestHandler } from 'express';

import { HttpError } from '../middlewares/http-error.js';
import { AuthenticatedUser } from '../modules/shared/auth/domain/user-account.js';
import { Role } from '../modules/shared/person/domain/person.js';

export class FakeAuthentication {
  private user: AuthenticatedUser | null = null;

  signInAs(roleId: number, homeIds: readonly number[] = []): void {
    this.user = new AuthenticatedUser({
      personId: 7,
      name: 'Maria Silva',
      email: 'maria@ecos.org',
      role: new Role(roleId, 'Papel de teste'),
      homeIds,
    });
  }

  signOut(): void {
    this.user = null;
  }

  readonly handle: RequestHandler = (request, _response, next) => {
    if (!this.user) {
      next(HttpError.unauthorized());
      return;
    }

    request.user = this.user;
    next();
  };
}

export const fakeAuthentication = new FakeAuthentication();
