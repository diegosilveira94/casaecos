import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient } from '../../../shared/http/http-client.js';
import { EventService } from './event-service.js';

const fetchMock = vi.fn<typeof fetch>();

function sentRequest(): { url: Parameters<typeof fetch>[0]; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[0]!;
  return { url, init: init! };
}

function createService(): EventService {
  return new EventService(new HttpClient('http://api.test', { readAccessToken: () => 'token' }));
}

describe('EventService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('lista os compromissos sem query string quando não há filtro', async () => {
    await createService().list();

    expect(sentRequest()).toMatchObject({
      url: 'http://api.test/agenda/events',
      init: { method: 'GET' },
    });
  });

  it('manda os filtros da listagem na query string', async () => {
    await createService().list({
      homeId: 2,
      from: '2026-10-01T00:00:00-03:00',
      to: '2026-11-01T00:00:00-03:00',
      pageSize: 200,
    });

    // URLSearchParams escapes the offset, so a `+01:00` would not arrive as a space.
    expect(sentRequest().url).toBe(
      'http://api.test/agenda/events?homeId=2&from=2026-10-01T00%3A00%3A00-03%3A00&to=2026-11-01T00%3A00%3A00-03%3A00&pageSize=200',
    );
  });

  it('lista os tipos de compromisso', async () => {
    await createService().listEventTypes();

    expect(sentRequest()).toMatchObject({
      url: 'http://api.test/agenda/event-types',
      init: { method: 'GET' },
    });
  });

  it('busca o compromisso pelo id', async () => {
    await createService().getById(1);

    expect(sentRequest()).toMatchObject({
      url: 'http://api.test/agenda/events/1',
      init: { method: 'GET' },
    });
  });

  it('cria o compromisso', async () => {
    const request = {
      title: 'Consulta pediatra',
      startDate: '2026-10-01T10:00:00-03:00',
      eventTypeId: 1,
      homeId: 1,
    };

    await createService().create(request);

    expect(sentRequest()).toMatchObject({
      url: 'http://api.test/agenda/events',
      init: { method: 'POST', body: JSON.stringify(request) },
    });
  });

  it('edita só os campos enviados', async () => {
    await createService().update(1, { endDate: null });

    expect(sentRequest()).toMatchObject({
      url: 'http://api.test/agenda/events/1',
      init: { method: 'PATCH', body: JSON.stringify({ endDate: null }) },
    });
  });

  it('exclui o compromisso', async () => {
    await createService().delete(1);

    expect(sentRequest()).toMatchObject({
      url: 'http://api.test/agenda/events/1',
      init: { method: 'DELETE' },
    });
  });
});
