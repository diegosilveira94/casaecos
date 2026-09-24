import type { Request, RequestHandler } from 'express';

import { HttpError } from '../../../../middlewares/http-error.js';
import { EXPIRED_OR_INVALID_SESSION, MISSING_ACCESS_TOKEN } from '../auth-messages.js';
import type { AuthenticatedUser } from '../domain/user-account.js';
import {
  PrismaUserAccountRepository,
  type UserAccountRepository,
} from '../repositories/user-account.repository.js';
import { JwtTokenIssuer, type TokenIssuer } from '../services/token-issuer.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- how Express exposes Request for augmentation
  namespace Express {
    interface Request {
      /** Written only by AuthenticationMiddleware. Read it with `currentUser`. */
      user?: AuthenticatedUser;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

function readBearerToken(request: Request): string | null {
  const authorization = request.get('authorization');
  if (!authorization?.startsWith(BEARER_PREFIX)) return null;

  const token = authorization.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

export class AuthenticationMiddleware {
  constructor(
    private readonly tokenIssuer: TokenIssuer,
    private readonly repository: UserAccountRepository,
  ) {}

  readonly handle: RequestHandler = async (request, _response, next) => {
    const token = readBearerToken(request);

    if (!token) {
      next(HttpError.unauthorized(MISSING_ACCESS_TOKEN));
      return;
    }

    const claims = await this.tokenIssuer.verify(token);

    // Reloaded on every request instead of trusting the payload: there is no
    // refresh token and therefore no revocation, so disabling a user or changing
    // their role has to take effect now, not whenever the token expires.
    const account = await this.repository.findByPersonId(claims.personId);

    if (!account) {
      next(HttpError.unauthorized(EXPIRED_OR_INVALID_SESSION));
      return;
    }

    request.user = account.toAuthenticatedUser();
    next();
  };
}

/**
 * The authenticated user of the request. Only valid in a handler that runs after
 * AuthenticationMiddleware — the 401 here is a safety net for a route registered
 * without it.
 */
export function currentUser(request: Request): AuthenticatedUser {
  if (!request.user) throw HttpError.unauthorized();
  return request.user;
}

export const authenticate = new AuthenticationMiddleware(
  new JwtTokenIssuer(),
  new PrismaUserAccountRepository(),
);
