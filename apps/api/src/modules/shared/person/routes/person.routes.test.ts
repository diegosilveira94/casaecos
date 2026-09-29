import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

import { createApp } from '../../../../app.js';
import { fakeAuthentication } from '../../../../test/fake-authentication.js';
import { ROLE_IDS } from '../domain/role-ids.js';

describe('rotas de pessoas', () => {
  beforeEach(() => {
    fakeAuthentication.signInAs(ROLE_IDS.secretary);
  });

  it('valida o id da pessoa', async () => {
    const response = await request(createApp()).get('/people/id-invalido');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('valida os dados obrigatórios ao criar', async () => {
    const response = await request(createApp()).post('/people').send({ name: 'Maria' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('recusa uma edição sem campos', async () => {
    const response = await request(createApp()).patch('/people/1').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('valida o filtro por papel', async () => {
    const response = await request(createApp()).get('/people?roleId=invalido');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('exige login nas rotas de pessoas e papéis', async () => {
    fakeAuthentication.signOut();

    await expect(request(createApp()).get('/people')).resolves.toMatchObject({ status: 401 });
    await expect(request(createApp()).get('/roles')).resolves.toMatchObject({ status: 401 });
  });

  it.each([
    ['cuidador', ROLE_IDS.caregiver],
    ['motorista', ROLE_IDS.driver],
  ])('recusa acesso de %s à lista geral de pessoas', async (_label, roleId) => {
    fakeAuthentication.signInAs(roleId, [1]);

    await expect(request(createApp()).get('/people')).resolves.toMatchObject({ status: 403 });
    await expect(request(createApp()).get('/roles')).resolves.toMatchObject({ status: 403 });
    await expect(request(createApp()).delete('/people/1')).resolves.toMatchObject({
      status: 403,
    });
  });
});
