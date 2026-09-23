import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.js';

describe('rotas de pessoas', () => {
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
});
