import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { env } from '../../../../config/env.js';
import { JwtTokenIssuer } from './token-issuer.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

const EXPIRED_OR_INVALID = {
  status: 401,
  message: 'Sessão expirada ou inválida. Faça login novamente.',
};

function signWith(payload: Record<string, unknown>, expirationSeconds: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('7')
    .setExpirationTime(expirationSeconds)
    .sign(secret);
}

describe('JwtTokenIssuer', () => {
  const issuer = new JwtTokenIssuer();

  it('emite e relê o token com person_id, e-mail e papel', async () => {
    const claims = { personId: 7, email: 'maria@ecos.org', roleId: 2 };

    const issued = await issuer.issue(claims);

    expect(issued.expiresInSeconds).toBe(env.JWT_EXPIRES_IN_SECONDS);
    await expect(issuer.read(issued.token)).resolves.toEqual(claims);
  });

  it('recusa token adulterado ou fora do formato', async () => {
    const issued = await issuer.issue({ personId: 7, email: 'maria@ecos.org', roleId: 2 });

    await expect(issuer.read(`${issued.token}x`)).rejects.toMatchObject(EXPIRED_OR_INVALID);
    await expect(issuer.read('nem-parece-um-jwt')).rejects.toMatchObject(EXPIRED_OR_INVALID);
  });

  it('recusa token expirado', async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 60;
    const token = await signWith({ email: 'maria@ecos.org', roleId: 2 }, expiredAt);

    await expect(issuer.read(token)).rejects.toMatchObject(EXPIRED_OR_INVALID);
  });

  it('recusa token assinado com outro segredo', async () => {
    const otherSecret = new TextEncoder().encode('outro-segredo-com-mais-de-32-caracteres!!');
    const token = await new SignJWT({ email: 'maria@ecos.org', roleId: 2 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('7')
      .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
      .sign(otherSecret);

    await expect(issuer.read(token)).rejects.toMatchObject(EXPIRED_OR_INVALID);
  });

  it('recusa token válido cujo payload não carrega o papel', async () => {
    const validUntil = Math.floor(Date.now() / 1000) + 60;
    const token = await signWith({ email: 'maria@ecos.org' }, validUntil);

    await expect(issuer.read(token)).rejects.toMatchObject(EXPIRED_OR_INVALID);
  });
});
