import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUserResponse, LoginResponse } from '@casaecos/shared-types';

import { App } from './App.js';
import { AuthProvider } from './modules/shared/auth/context/AuthProvider.js';
import { sessionStore } from './modules/shared/auth/session-store.js';

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

// After the login the agenda loads its month: an empty one keeps it out of the way.
const EMPTY_AGENDA: Record<string, unknown> = {
  '/agenda/events': { items: [], page: 1, pageSize: 200, total: 0 },
  '/agenda/event-types': [],
};

function answerAuthWith(body: unknown): void {
  fetchMock.mockImplementation((input) => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    return Promise.resolve(jsonResponse(200, EMPTY_AGENDA[path] ?? body));
  });
}

function renderApp(initialPath = '/login'): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function submitLogin(email: string, password: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Senha'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('manda o usuário sem sessão para o login', () => {
    renderApp('/agenda');

    expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument();
  });

  it('espera a restauração da sessão antes de decidir, ao recarregar a página', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    answerAuthWith(maria);

    renderApp('/agenda');

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
  });

  it('salva a sessão e leva para a página pedida depois do login', async () => {
    const loginResponse: LoginResponse = {
      token: 'token-novo',
      expiresInSeconds: 3600,
      user: maria,
    };
    answerAuthWith(loginResponse);
    renderApp('/agenda');

    await submitLogin(' maria@ecos.org ', 'senha-correta');

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBe('token-novo');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/auth/login');
    expect(init?.body).toBe(JSON.stringify({ email: 'maria@ecos.org', password: 'senha-correta' }));
  });

  it.each([
    ['credenciais inválidas', 401, 'E-mail ou senha inválidos'],
    [
      'excesso de tentativas',
      429,
      'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
    ],
  ])('mostra a mensagem da API para %s', async (_label, status, message) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { message }));
    renderApp();

    await submitLogin('maria@ecos.org', 'senha-errada');

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(sessionStore.readAccessToken()).toBeNull();
  });

  it('avisa quando o servidor não responde', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderApp();

    await submitLogin('maria@ecos.org', 'senha');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor',
    );
  });

  it('valida o formato do e-mail antes de chamar a API', async () => {
    renderApp();

    await submitLogin('email-invalido', 'senha');

    expect(screen.getByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mostra o carregamento e bloqueia o botão durante o login', async () => {
    let answerLogin: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        answerLogin = resolve;
      }),
    );
    renderApp();

    await submitLogin('maria@ecos.org', 'senha-correta');

    expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled();
    answerLogin(jsonResponse(200, { token: 'token-novo', expiresInSeconds: 3600, user: maria }));
    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
  });

  it('leva à Agenda pela navegação e mostra os outros módulos ainda sem ação', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    answerAuthWith(maria);
    renderApp('/agenda');

    const navigation = await screen.findByRole('navigation', { name: 'Módulos' });
    const links = within(navigation).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Agenda']);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    const upcomingModules = within(navigation).getAllByRole('button');
    expect(upcomingModules.map((button) => button.textContent)).toEqual([
      'Medicamentos',
      'Relatórios',
      'Prestação de Contas',
      'Configurações',
      'Ajuda',
    ]);
    expect(upcomingModules.every((button) => button.getAttribute('aria-disabled') === 'true')).toBe(
      true,
    );
  });

  it('volta para o login ao sair', async () => {
    sessionStore.save({ token: 'token-salvo', expiresInSeconds: 3600 });
    answerAuthWith(maria);
    renderApp('/agenda');

    await userEvent.click(await screen.findByRole('button', { name: /Maria Silva/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));

    expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument();
    expect(sessionStore.readAccessToken()).toBeNull();
  });
});
