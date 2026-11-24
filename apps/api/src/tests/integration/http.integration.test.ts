import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

describe('infraestrutura HTTP (integracao)', () => {
  it('integra roteador e controller na rota de saude', async () => {
    const response = await request(createApp()).get('/health');
    const body: unknown = response.body;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok' });
    expect(body).toHaveProperty('uptime');
    if (typeof body !== 'object' || body === null || !('uptime' in body)) return;
    expect(typeof body.uptime).toBe('number');
  });

  it('responde a API no formato JSON', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.headers['content-type']).toMatch(/^application\/json/);
  });

  it('aplica os cabecalhos de seguranca do Helmet', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('libera pelo CORS a origem configurada para a aplicacao web', async () => {
    const response = await request(createApp())
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('integra o tratador de rota inexistente ao envelope de erro', async () => {
    const response = await request(createApp()).get('/rota-que-nao-existe');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Rota não encontrada' });
  });
});
