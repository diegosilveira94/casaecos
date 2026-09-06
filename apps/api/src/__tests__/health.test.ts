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
