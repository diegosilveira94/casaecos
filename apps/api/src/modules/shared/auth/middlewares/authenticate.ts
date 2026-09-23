import type { Request, RequestHandler } from 'express';

import { HttpError } from '../../../../middlewares/http-error.js';
import type { AuthenticatedUser } from '../domain/user-account.js';
import {
  PrismaUserAccountRepository,
  type UserAccountRepository,
} from '../repositories/user-account.repository.js';
import { JwtTokenIssuer, type TokenIssuer } from '../services/token-issuer.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- forma que o Express expõe para aumentar o Request
  namespace Express {
    interface Request {
      /** Preenchido só pelo AuthenticationMiddleware. Use `currentUser` para ler. */
      user?: AuthenticatedUser;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

const MISSING_TOKEN_MESSAGE = 'Envie o token de acesso no cabeçalho Authorization';
const EXPIRED_OR_INVALID_MESSAGE = 'Sessão expirada ou inválida. Faça login novamente.';

export class AuthenticationMiddleware {
  constructor(
    private readonly tokenIssuer: TokenIssuer,
    private readonly repository: UserAccountRepository,
  ) {}

  readonly handle: RequestHandler = async (request, _response, next) => {
    const header = request.get('authorization');

    if (!header?.startsWith(BEARER_PREFIX)) {
      next(HttpError.unauthorized(MISSING_TOKEN_MESSAGE));
      return;
    }

    const claims = await this.tokenIssuer.read(header.slice(BEARER_PREFIX.length).trim());

    // Relê a conta a cada requisição em vez de confiar no payload: sem refresh
    // token não há revogação, e assim desligar um usuário ou trocar seu papel
    // vale na hora, não só quando o token expirar.
    const account = await this.repository.findByPersonId(claims.personId);

    if (!account) {
      next(HttpError.unauthorized(EXPIRED_OR_INVALID_MESSAGE));
      return;
    }

    request.user = account.toAuthenticatedUser();
    next();
  };
}

/**
 * Usuário autenticado da requisição. Só pode ser chamado em handler que roda
 * depois do `AuthenticationMiddleware` — o 401 aqui é rede de segurança para
 * uma rota registrada sem ele.
 */
export function currentUser(request: Request): AuthenticatedUser {
  if (!request.user) throw HttpError.unauthorized();
  return request.user;
}

export const authenticate = new AuthenticationMiddleware(
  new JwtTokenIssuer(),
  new PrismaUserAccountRepository(),
);
