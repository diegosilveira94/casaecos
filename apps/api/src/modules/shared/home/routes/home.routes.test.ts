import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.js';

describe('rotas de casas', () => {
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
});
