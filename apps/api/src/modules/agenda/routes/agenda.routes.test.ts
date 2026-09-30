import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

import { createApp } from '../../../app.js';
import { fakeAuthentication } from '../../../test/fake-authentication.js';
import { ROLE_IDS } from '../../shared/person/domain/role-ids.js';

const validEvent = {
  title: 'Consulta pediatra',
  startDate: '2026-10-01T10:00:00-03:00',
  eventTypeId: 1,
  homeId: 1,
};

describe('rotas de compromissos', () => {
  beforeEach(() => {
    fakeAuthentication.signInAs(ROLE_IDS.secretary);
  });

  it('valida o id do compromisso', async () => {
    const response = await request(createApp()).get('/agenda/events/id-invalido');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('valida os dados obrigatórios ao criar', async () => {
    const response = await request(createApp()).post('/agenda/events').send({ title: 'Consulta' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it.each([
    ['sem fuso', '2026-10-01T10:00:00'],
    ['só a data', '2026-10-01'],
    ['texto livre', 'amanhã às 10h'],
  ])('recusa data %s', async (_label, startDate) => {
    const response = await request(createApp())
      .post('/agenda/events')
      .send({ ...validEvent, startDate });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: 'Dados inválidos',
      details: [expect.objectContaining({ path: ['startDate'] })],
    });
  });

  it('recusa campo desconhecido', async () => {
    const response = await request(createApp())
      .post('/agenda/events')
      .send({ ...validEvent, participants: [1] });

    expect(response.status).toBe(400);
  });

  it('recusa uma edição sem campos', async () => {
    const response = await request(createApp()).patch('/agenda/events/1').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });

  it('exige login', async () => {
    fakeAuthentication.signOut();

    await expect(request(createApp()).get('/agenda/events/1')).resolves.toMatchObject({
      status: 401,
    });
    await expect(
      request(createApp()).post('/agenda/events').send(validEvent),
    ).resolves.toMatchObject({ status: 401 });
  });

  it.each([
    ['cuidador', ROLE_IDS.caregiver],
    ['motorista', ROLE_IDS.driver],
  ])('recusa que %s crie, edite ou exclua compromissos', async (_label, roleId) => {
    fakeAuthentication.signInAs(roleId, [1]);
    const app = createApp();

    await expect(request(app).post('/agenda/events').send(validEvent)).resolves.toMatchObject({
      status: 403,
    });
    await expect(
      request(app).patch('/agenda/events/1').send({ title: 'Outro' }),
    ).resolves.toMatchObject({ status: 403 });
    await expect(request(app).delete('/agenda/events/1')).resolves.toMatchObject({
      status: 403,
    });
  });

  it('recusa acesso de acolhido até para leitura', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.sheltered, [1]);

    await expect(request(createApp()).get('/agenda/events/1')).resolves.toMatchObject({
      status: 403,
    });
  });
});
