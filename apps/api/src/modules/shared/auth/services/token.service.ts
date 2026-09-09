import { jwtVerify, SignJWT } from 'jose';

import type { AuthTokenPayload } from '@casaecos/shared-types';

import { env } from '../../../../config/env.js';

export class TokenService {
  private readonly secret: Uint8Array;

  constructor(
    secret: string,
    private readonly expiresInSeconds: number,
  ) {
    this.secret = new TextEncoder().encode(secret);
  }

  sign(payload: AuthTokenPayload): Promise<string> {
    return new SignJWT({ role: payload.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(payload.personId))
      .setIssuedAt()
      .setExpirationTime(`${String(this.expiresInSeconds)}s`)
      .sign(this.secret);
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret, { algorithms: ['HS256'] });
    const personId = Number(payload.sub);

    if (!Number.isInteger(personId) || personId <= 0 || typeof payload.role !== 'string') {
      throw new Error('Token sem os dados obrigatórios');
    }

    return { personId, role: payload.role };
  }
}

export const tokenService = new TokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN_SECONDS);
