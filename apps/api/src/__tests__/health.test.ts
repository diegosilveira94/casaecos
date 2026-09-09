import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../app.js';

describe('GET /health', () => {
  it('responde ok', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});

describe('rota inexistente', () => {
  it('responde 404 com o envelope de erro', async () => {
    const response = await request(createApp()).get('/nao-existe');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ message: 'Rota não encontrada' });
  });
});

describe('autenticação', () => {
  it('protege as rotas da agenda', async () => {
    const response = await request(createApp()).get('/agenda');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ message: 'Não autenticado' });
  });

  it('valida o formato dos dados de login', async () => {
    const response = await request(createApp())
      .post('/auth/login')
      .send({ email: 'email-invalido', password: '' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Dados inválidos' });
  });
});
