import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUserResponse, LoginResponse } from '@casaecos/shared-types';

import { App } from '../../App.js';
import { AuthProvider } from '../../modules/shared/auth/context/AuthProvider.js';
import { sessionStore } from '../../modules/shared/auth/session-store.js';

const secretary: AuthenticatedUserResponse = {
  personId: 1,
  name: 'Maria Silva',
  email: 'maria@ecos.org',
  role: { id: 2, description: 'Secretario' },
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

const EMPTY_SCREEN_DATA: Record<string, unknown> = {
  '/agenda/events': { items: [], page: 1, pageSize: 200, total: 0 },
  '/agenda/event-types': [],
  '/homes': [],
  '/people': [],
  '/roles': [],
};

function answerWith(defaultBody: unknown): void {
  fetchMock.mockImplementation((input) => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    return Promise.resolve(jsonResponse(200, EMPTY_SCREEN_DATA[path] ?? defaultBody));
  });
}

function renderApplication(initialPath = '/login'): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function logIn(email = 'maria@ecos.org', password = 'senha-correta'): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Senha'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('autenticacao (aceitacao)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('redireciona uma pessoa sem sessao para a tela de acesso', () => {
    renderApplication('/agenda');

    expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument();
  });

  it('permite entrar e acessar a agenda com credenciais validas', async () => {
    const response: LoginResponse = {
      token: 'token-valido',
      expiresInSeconds: 3600,
      user: secretary,
    };
    answerWith(response);
    renderApplication('/agenda');

    await logIn(' maria@ecos.org ', 'senha-correta');

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBe('token-valido');
  });

  it('informa quando as credenciais sao recusadas', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'E-mail ou senha inválidos' }));
    renderApplication();

    await logIn('maria@ecos.org', 'senha-errada');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos');
    expect(sessionStore.readAccessToken()).toBeNull();
  });

  it('restaura uma sessao salva ao recarregar uma rota protegida', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    answerWith(secretary);

    renderApplication('/agenda');

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
  });

  it('encerra a sessao e volta ao login quando a pessoa sai', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    answerWith(secretary);
    renderApplication('/agenda');

    await userEvent.click(await screen.findByRole('button', { name: /Maria Silva/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBeNull();
  });
});
