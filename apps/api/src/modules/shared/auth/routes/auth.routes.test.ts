import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../../app.js';
import { errorHandler } from '../../../../middlewares/error-handler.js';
import { createLoginRateLimiter } from './auth.routes.js';

describe('rotas de autenticação', () => {
  it('valida o corpo do login', async () => {
    const withoutPassword = await request(createApp())
      .post('/auth/login')
      .send({ email: 'maria@ecos.org' });
    expect(withoutPassword.status).toBe(400);
    expect(withoutPassword.body).toMatchObject({ message: 'Dados inválidos' });

    const invalidEmail = await request(createApp())
      .post('/auth/login')
      .send({ email: 'nao-e-email', password: 'senha-correta' });
    expect(invalidEmail.status).toBe(400);
  });

  it('exige token nas rotas protegidas', async () => {
    await expect(request(createApp()).get('/auth/me')).resolves.toMatchObject({
      status: 401,
      body: { message: 'Envie o token de acesso no cabeçalho Authorization' },
    });

    await expect(
      request(createApp())
        .post('/auth/accounts')
        .send({ personId: 1, email: 'maria@ecos.org', password: 'senha-nova-123' }),
    ).resolves.toMatchObject({ status: 401 });
  });

  it('recusa token inválido antes de validar o corpo', async () => {
    const response = await request(createApp())
      .post('/auth/accounts')
      .set('Authorization', 'Bearer token-forjado')
      .send({});

    expect(response.status).toBe(401);
  });

  it('limita tentativas de login por IP', async () => {
    // Limitador próprio com teto 1: o da aplicação usa o teto do ambiente, que a
    // suíte deixa alto para não derrubar os testes de validação acima.
    const app = express();
    app.use(express.json());
    app.post('/auth/login', createLoginRateLimiter(1), (_httpRequest, response) => {
      response.json({ message: 'ok' });
    });
    app.use(errorHandler);

    await expect(request(app).post('/auth/login').send({})).resolves.toMatchObject({ status: 200 });

    const blocked = await request(app).post('/auth/login').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
    });
  });
});
