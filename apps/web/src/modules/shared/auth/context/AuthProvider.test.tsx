import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUserResponse, LoginResponse } from '@casaecos/shared-types';

import { apiClient } from '../../../../shared/http/api-client.js';
import { sessionStore } from '../session-store.js';
import { AuthProvider } from './AuthProvider.js';
import { useAuth } from './use-auth.js';

const maria: AuthenticatedUserResponse = {
  personId: 1,
  name: 'Maria Silva',
  email: 'maria@ecos.org',
  role: { id: 2, description: 'Secretário' },
  permissions: [
    'person:read',
    'person:write',
    'home:read',
    'home:write',
    'event:read',
    'event:write',
  ],
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function SessionProbe(): React.JSX.Element {
  const auth = useAuth();

  return (
    <>
      <p>{auth.status === 'authenticated' ? `Olá, ${auth.user.name}` : auth.status}</p>
      <p>{auth.can('event:write') ? 'pode editar a agenda' : 'não edita a agenda'}</p>
      <button
        type="button"
        onClick={() => void auth.login({ email: maria.email, password: 'senha-correta' })}
      >
        Entrar
      </button>
      <button type="button" onClick={auth.logout}>
        Sair
      </button>
    </>
  );
}

function renderWithAuth(): void {
  render(
    <AuthProvider>
      <SessionProbe />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('começa anônimo, sem chamar a API, quando não há sessão salva', () => {
    renderWithAuth();

    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restaura a sessão salva perguntando à API quem é o usuário', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    fetchMock.mockResolvedValue(jsonResponse(200, maria));

    renderWithAuth();

    expect(screen.getByText('restoring')).toBeInTheDocument();
    expect(await screen.findByText('Olá, Maria Silva')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/auth/me');
    expect(new Headers(init!.headers).get('Authorization')).toBe('Bearer token-salvo');
  });

  it('responde can() com as permissões do usuário, e nega tudo sem sessão', async () => {
    const driver: AuthenticatedUserResponse = {
      ...maria,
      role: { id: 4, description: 'Motorista' },
      permissions: ['event:read'],
    };
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, maria));
    renderWithAuth();

    expect(screen.getByText('não edita a agenda')).toBeInTheDocument();
    expect(await screen.findByText('pode editar a agenda')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { token: 'token-novo', expiresInSeconds: 3600, user: driver }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Olá, Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('não edita a agenda')).toBeInTheDocument();
  });

  it('descarta a sessão salva que a API recusa', async () => {
    sessionStore.save({ token: 'token-revogado', expiresInSeconds: 3600 });
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Sessão expirada' }));

    renderWithAuth();

    expect(await screen.findByText('anonymous')).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBeNull();
  });

  it('mantém o token quando a API está fora do ar, para tentar de novo depois', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    renderWithAuth();

    expect(await screen.findByText('anonymous')).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBe('token-salvo');
  });

  it('salva o token e autentica no login', async () => {
    const loginResponse: LoginResponse = {
      token: 'token-novo',
      expiresInSeconds: 3600,
      user: maria,
    };
    fetchMock.mockResolvedValue(jsonResponse(200, loginResponse));
    renderWithAuth();

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Olá, Maria Silva')).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBe('token-novo');
  });

  it('encerra a sessão quando qualquer chamada recebe 401', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, maria));
    renderWithAuth();
    await screen.findByText('Olá, Maria Silva');

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Sessão expirada' }));
    await act(() => apiClient.get('/homes').catch(() => undefined));

    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBeNull();
  });

  it('esquece a sessão no logout', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    fetchMock.mockResolvedValue(jsonResponse(200, maria));
    renderWithAuth();
    await screen.findByText('Olá, Maria Silva');

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBeNull();
  });
});
