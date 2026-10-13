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
});
