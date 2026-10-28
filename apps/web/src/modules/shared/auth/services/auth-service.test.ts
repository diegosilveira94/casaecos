import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient } from '../../../../shared/http/http-client.js';
import { AuthService } from './auth-service.js';

const fetchMock = vi.fn<typeof fetch>();

describe('AuthService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  const service = (): AuthService =>
    new AuthService(new HttpClient('http://api.test', { readAccessToken: () => 'token' }));

  it('lista as credenciais em GET /auth/accounts', async () => {
    await service().listAccounts();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/auth/accounts');
    expect(init?.method).toBe('GET');
  });

  it('cria a credencial em POST /auth/accounts, com o token de quem está logado', async () => {
    await service().createAccount({
      personId: 3,
      email: 'ana@ecos.org',
      password: 'flor-rio-1234',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/auth/accounts');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token');
    expect(JSON.parse(init?.body as string)).toEqual({
      personId: 3,
      email: 'ana@ecos.org',
      password: 'flor-rio-1234',
    });
  });
});
