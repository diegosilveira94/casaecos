import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

import { createApp } from '../../../../app.js';
import { fakeAuthentication } from '../../../../test/fake-authentication.js';
import { ROLE_IDS } from '../../person/domain/role-ids.js';

describe('rotas de senha', () => {
  afterEach(() => {
    fakeAuthentication.signOut();
  });

  it('valida a nova senha na redefinição', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.coordinator);

    await expect(
      request(createApp()).patch('/auth/accounts/7/password').send({ password: 'curta' }),
    ).resolves.toMatchObject({ status: 400, body: { message: 'Dados inválidos' } });
  });

  it('impede quem não gerencia contas de redefinir a senha de outra pessoa', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.secretary);

    await expect(
      request(createApp()).patch('/auth/accounts/7/password').send({ password: 'senha-nova-123' }),
    ).resolves.toMatchObject({
      status: 403,
      body: { message: 'Seu papel não permite esta ação' },
    });
  });
});
