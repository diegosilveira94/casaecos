import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpClient } from '../../../../shared/http/http-client.js';
import { AuthService } from './auth-service.js';

const fetchMock = vi.fn<typeof fetch>();

describe('AuthService password operations', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    service = new AuthService(
      new HttpClient('http://api.test', { readAccessToken: () => 'token' }),
    );
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('lista contas e redefine a senha pelo identificador da pessoa', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    await service.listAccounts();
    await service.resetPassword(9, { password: 'temporaria-123' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/auth/accounts');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('GET');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://api.test/auth/accounts/9/password');
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ password: 'temporaria-123' }),
      }),
    );
  });
});
