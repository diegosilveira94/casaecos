import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from './api-request-error.js';
import { type AccessTokenSource, HttpClient } from './http-client.js';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sentRequest(): { url: Parameters<typeof fetch>[0]; init: RequestInit; headers: Headers } {
  const [url, init] = fetchMock.mock.calls[0]!;
  return { url, init: init!, headers: new Headers(init!.headers) };
}

function createClient(token: string | null = 'token-valido'): HttpClient {
  const tokenSource: AccessTokenSource = { readAccessToken: () => token };
  return new HttpClient('http://api.test', tokenSource);
}

async function captureError(request: Promise<unknown>): Promise<ApiRequestError> {
  const error: unknown = await request.catch((reason: unknown) => reason);
  expect(error).toBeInstanceOf(ApiRequestError);
  return error as ApiRequestError;
}

describe('HttpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('envia o token e o corpo em JSON e devolve o payload cru', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 1, name: 'Casa Azul' }));

    const home = await createClient().post('/homes', { name: 'Casa Azul' });

    const { url, init, headers } = sentRequest();
    expect(home).toEqual({ id: 1, name: 'Casa Azul' });
    expect(url).toBe('http://api.test/homes');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Casa Azul' }));
    expect(headers.get('Authorization')).toBe('Bearer token-valido');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('não manda Content-Type nem corpo quando não há corpo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await createClient().get('/roles');

    const { init, headers } = sentRequest();
    expect(init.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('não manda Authorization quando não há token salvo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await createClient(null).get('/roles');

    expect(sentRequest().headers.has('Authorization')).toBe(false);
  });

  it('transforma o ApiError em ApiRequestError com status, mensagem e detalhes', async () => {
    const issues = [{ path: ['name'], message: 'Obrigatório' }];
    fetchMock.mockResolvedValue(jsonResponse(400, { message: 'Dados inválidos', details: issues }));

    const error = await captureError(createClient().post('/people', {}));

    expect(error.status).toBe(400);
    expect(error.message).toBe('Dados inválidos');
    expect(error.details).toEqual(issues);
  });

  it('usa mensagem genérica quando a resposta de erro não é um ApiError', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));

    const error = await captureError(createClient().get('/homes'));

    expect(error.status).toBe(502);
    expect(error.message).toBe('Não foi possível concluir a solicitação.');
  });

  it('avisa quando o servidor está fora do ar', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await captureError(createClient().get('/homes'));

    expect(error.status).toBeNull();
    expect(error.message).toBe(
      'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.',
    );
  });

  describe('sessão recusada', () => {
    it('avisa quem escuta quando a API responde 401 numa chamada autenticada', async () => {
      const client = createClient();
      const onUnauthorized = vi.fn();
      client.onUnauthorized(onUnauthorized);
      fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Sessão expirada' }));

      await captureError(client.get('/auth/me'));

      expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it('trata o 401 do login como senha errada, sem token e sem encerrar sessão', async () => {
      const client = createClient();
      const onUnauthorized = vi.fn();
      client.onUnauthorized(onUnauthorized);
      fetchMock.mockResolvedValue(jsonResponse(401, { message: 'E-mail ou senha inválidos' }));

      const error = await captureError(
        client.post('/auth/login', { email: 'a@b.c', password: 'x' }, { authenticated: false }),
      );

      expect(error.message).toBe('E-mail ou senha inválidos');
      expect(sentRequest().headers.has('Authorization')).toBe(false);
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('não encerra a sessão num 403 de recurso fora do escopo', async () => {
      const client = createClient();
      const onUnauthorized = vi.fn();
      client.onUnauthorized(onUnauthorized);
      fetchMock.mockResolvedValue(jsonResponse(403, { message: 'Sem acesso a esta casa' }));

      await captureError(client.get('/homes/7'));

      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('para de avisar depois de cancelar a inscrição', async () => {
      const client = createClient();
      const onUnauthorized = vi.fn();
      const unsubscribe = client.onUnauthorized(onUnauthorized);
      unsubscribe();
      fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Sessão expirada' }));

      await captureError(client.get('/auth/me'));

      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });
});
