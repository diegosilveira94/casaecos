import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient } from '../../../../shared/http/http-client.js';
import { HomeService } from './home-service.js';

const fetchMock = vi.fn<typeof fetch>();

describe('HomeService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('lista as casas em GET /homes', async () => {
    const service = new HomeService(
      new HttpClient('http://api.test', { readAccessToken: () => 'token' }),
    );

    await expect(service.list()).resolves.toEqual([]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/homes');
    expect(init?.method).toBe('GET');
  });

  it('lista as pessoas da casa em GET /homes/:id/people', async () => {
    const service = new HomeService(
      new HttpClient('http://api.test', { readAccessToken: () => 'token' }),
    );

    await expect(service.listPeople(7)).resolves.toEqual([]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/homes/7/people');
    expect(init?.method).toBe('GET');
  });

  it.each([
    ['busca uma casa', (service: HomeService) => service.get(7), 'GET', '/homes/7'],
    [
      'cria',
      (service: HomeService) =>
        service.create({ name: 'Casa Fé', organizationId: 1, responsibleId: 3 }),
      'POST',
      '/homes',
    ],
    [
      'edita',
      (service: HomeService) => service.update(7, { name: 'Casa Fé' }),
      'PATCH',
      '/homes/7',
    ],
    ['exclui', (service: HomeService) => service.delete(7), 'DELETE', '/homes/7'],
    [
      'vincula uma pessoa',
      (service: HomeService) => service.linkPerson(7, 3),
      'POST',
      '/homes/7/people/3',
    ],
    [
      'desvincula uma pessoa',
      (service: HomeService) => service.unlinkPerson(7, 3),
      'DELETE',
      '/homes/7/people/3',
    ],
  ] as const)('%s', async (_label, call, method, path) => {
    const service = new HomeService(
      new HttpClient('http://api.test', { readAccessToken: () => 'token' }),
    );

    await call(service);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`http://api.test${path}`);
    expect(init?.method).toBe(method);
  });
});
