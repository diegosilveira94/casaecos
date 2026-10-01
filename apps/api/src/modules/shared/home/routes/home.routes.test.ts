import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

import { createApp } from '../../../../app.js';
import { fakeAuthentication } from '../../../../test/fake-authentication.js';
import { ROLE_IDS } from '../../person/domain/role-ids.js';

describe('rotas de casas', () => {
  beforeEach(() => {
    fakeAuthentication.signInAs(ROLE_IDS.coordinator);
  });

  it('valida o id da casa', async () => {
    const response = await request(createApp()).get('/homes/id-invalido');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('valida os dados obrigatórios ao criar', async () => {
    const response = await request(createApp()).post('/homes').send({ name: 'Casa Girassol' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('recusa uma edição sem campos', async () => {
    const response = await request(createApp()).patch('/homes/1').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('valida o filtro por organização', async () => {
    const response = await request(createApp()).get('/homes?organizationId=invalido');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('valida ids nas rotas de vínculo', async () => {
    const linkResponse = await request(createApp()).post('/homes/1/people/invalido');
    const inverseListResponse = await request(createApp()).get('/people/invalido/homes');

    expect(linkResponse.status).toBe(400);
    expect(inverseListResponse.status).toBe(400);
  });

  it('exige login em todas as rotas de casas', async () => {
    fakeAuthentication.signOut();

    await expect(request(createApp()).get('/homes')).resolves.toMatchObject({ status: 401 });
    await expect(request(createApp()).get('/people/1/homes')).resolves.toMatchObject({
      status: 401,
    });
  });

  it('recusa alterações feitas por cuidador', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.caregiver, [1]);

    const createResponse = await request(createApp()).post('/homes').send({});
    const linkResponse = await request(createApp()).post('/homes/1/people/2');
    const inverseListResponse = await request(createApp()).get('/people/2/homes');

    expect(createResponse.status).toBe(403);
    expect(createResponse.body).toMatchObject({ message: 'Seu papel não permite esta ação' });
    expect(linkResponse.status).toBe(403);
    expect(inverseListResponse.status).toBe(403);
  });

  it('recusa casa fora do escopo do cuidador', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.caregiver, [1]);

    const response = await request(createApp()).get('/homes/2');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: 'Você não tem acesso a esta casa' });
  });

  it('recusa leitura de casas pelo motorista', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.driver);

    await expect(request(createApp()).get('/homes')).resolves.toMatchObject({ status: 403 });
  });
});
