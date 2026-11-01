import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient } from '../../../../shared/http/http-client.js';
import { PersonService } from './person-service.js';

const fetchMock = vi.fn<typeof fetch>();

describe('PersonService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('lista todas as pessoas em GET /people', async () => {
    const service = new PersonService(
      new HttpClient('http://api.test', { readAccessToken: () => 'token' }),
    );

    await expect(service.list()).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/people');
  });

  it('lista as pessoas de um papel em GET /people?roleId=', async () => {
    const service = new PersonService(
      new HttpClient('http://api.test', { readAccessToken: () => 'token' }),
    );

    await expect(service.listByRole(4)).resolves.toEqual([]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/people?roleId=4');
    expect(init?.method).toBe('GET');
  });
});
