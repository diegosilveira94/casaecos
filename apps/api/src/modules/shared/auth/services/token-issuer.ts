import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

import { env } from '../../../../config/env.js';
import { HttpError } from '../../../../middlewares/http-error.js';

const ALGORITHM = 'HS256';

const EXPIRED_OR_INVALID_MESSAGE = 'Sessão expirada ou inválida. Faça login novamente.';

/**
 * O que o token carrega. `role` entra para o RBAC (ECOS-14); o escopo por casa
 * (`home_person`) fica fora de propósito — vínculo de casa muda, e token não se
 * atualiza: serviria escopo vencido até expirar.
 */
export interface AuthTokenClaims {
  personId: number;
  email: string;
  roleId: number;
}

export interface IssuedToken {
  token: string;
  expiresInSeconds: number;
}

export interface TokenIssuer {
  issue(claims: AuthTokenClaims): Promise<IssuedToken>;
  read(token: string): Promise<AuthTokenClaims>;
}

// `sub` é o person_id: identificador da pessoa em todo o resto do sistema.
const claimsSchema = z.object({
  sub: z.coerce.number().int().positive(),
  email: z.string().min(1),
  roleId: z.number().int().positive(),
});

export class JwtTokenIssuer implements TokenIssuer {
  private readonly secret = new TextEncoder().encode(env.JWT_SECRET);
  private readonly expiresInSeconds = env.JWT_EXPIRES_IN_SECONDS;

  async issue(claims: AuthTokenClaims): Promise<IssuedToken> {
    const issuedAtSeconds = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({ email: claims.email, roleId: claims.roleId })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(String(claims.personId))
      .setIssuedAt(issuedAtSeconds)
      .setExpirationTime(issuedAtSeconds + this.expiresInSeconds)
      .sign(this.secret);

    return { token, expiresInSeconds: this.expiresInSeconds };
  }

  async read(token: string): Promise<AuthTokenClaims> {
    let payload: unknown;

    try {
      // `algorithms` fixo: sem isso um token forjado poderia pedir outro algoritmo.
      ({ payload } = await jwtVerify(token, this.secret, { algorithms: [ALGORITHM] }));
    } catch {
      throw HttpError.unauthorized(EXPIRED_OR_INVALID_MESSAGE);
    }

    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) {
      // Assinatura válida mas payload fora do formato: token de uma versão antiga
      // do sistema. Para o cliente é o mesmo caso de token expirado.
      throw HttpError.unauthorized(EXPIRED_OR_INVALID_MESSAGE);
    }

    return {
      personId: claims.data.sub,
      email: claims.data.email,
      roleId: claims.data.roleId,
    };
  }
}
