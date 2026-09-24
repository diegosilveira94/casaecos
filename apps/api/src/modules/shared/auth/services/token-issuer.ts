import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

import { env } from '../../../../config/env.js';
import { HttpError } from '../../../../middlewares/http-error.js';
import { EXPIRED_OR_INVALID_SESSION } from '../auth-messages.js';

const SIGNING_ALGORITHM = 'HS256';

/**
 * What the token carries. The house scope (`home_person`) is left out on purpose:
 * a person changes houses and the token does not follow, so it would hand out a
 * stale scope until it expired.
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
  verify(token: string): Promise<AuthTokenClaims>;
}

const tokenPayloadSchema = z.object({
  sub: z.coerce.number().int().positive(),
  email: z.string().min(1),
  roleId: z.number().int().positive(),
});

function toClaims(payload: unknown): AuthTokenClaims {
  const parsedPayload = tokenPayloadSchema.safeParse(payload);

  // Valid signature but unexpected payload means a token from an older version of
  // the system. For the client that is the same case as an expired token.
  if (!parsedPayload.success) throw HttpError.unauthorized(EXPIRED_OR_INVALID_SESSION);

  return {
    personId: parsedPayload.data.sub,
    email: parsedPayload.data.email,
    roleId: parsedPayload.data.roleId,
  };
}

function currentTimeInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export class JwtTokenIssuer implements TokenIssuer {
  private readonly secret = new TextEncoder().encode(env.JWT_SECRET);
  private readonly expiresInSeconds = env.JWT_EXPIRES_IN_SECONDS;

  async issue(claims: AuthTokenClaims): Promise<IssuedToken> {
    const issuedAt = currentTimeInSeconds();

    const token = await new SignJWT({ email: claims.email, roleId: claims.roleId })
      .setProtectedHeader({ alg: SIGNING_ALGORITHM })
      .setSubject(String(claims.personId))
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + this.expiresInSeconds)
      .sign(this.secret);

    return { token, expiresInSeconds: this.expiresInSeconds };
  }

  async verify(token: string): Promise<AuthTokenClaims> {
    return toClaims(await this.verifySignature(token));
  }

  private async verifySignature(token: string): Promise<unknown> {
    try {
      // Pinning the algorithm: otherwise a forged token could ask for another one.
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: [SIGNING_ALGORITHM],
      });
      return payload;
    } catch {
      throw HttpError.unauthorized(EXPIRED_OR_INVALID_SESSION);
    }
  }
}
