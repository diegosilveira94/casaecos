import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App.js';
import { AuthProvider } from './modules/auth/context/AuthProvider.js';

function renderApp(initialPath = '/login'): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redireciona usuário não autenticado para o login', () => {
    renderApp('/agenda');

    expect(screen.getByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument();
  });

  it('mantém a agenda disponível para usuário autenticado', () => {
    window.localStorage.setItem('casaecos.authToken', 'existing-token');

    renderApp('/agenda');

    expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
  });

  it('armazena o token e leva o usuário para a agenda após o login', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ token: 'valid-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    await user.type(screen.getByLabelText('E-mail'), ' cuidadora@ecos.org.br ');
    await user.type(screen.getByLabelText('Senha'), 'segredo');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(window.localStorage.getItem('casaecos.authToken')).toBe('valid-token');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3333/auth/login',
      expect.objectContaining({
        body: JSON.stringify({ email: 'cuidadora@ecos.org.br', password: 'segredo' }),
        method: 'POST',
      }),
    );
  });

  it('mostra uma mensagem em português quando as credenciais são inválidas', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    renderApp();

    await user.type(screen.getByLabelText('E-mail'), 'cuidadora@ecos.org.br');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(window.localStorage.getItem('casaecos.authToken')).toBeNull();
  });

  it('valida o formato do e-mail antes de chamar a API', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    await user.type(screen.getByLabelText('E-mail'), 'email-invalido');
    await user.type(screen.getByLabelText('Senha'), 'segredo');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mostra feedback de carregamento durante a autenticação', async () => {
    const user = userEvent.setup();
    let finishRequest: ((response: Response) => void) | undefined;
    const pendingRequest = new Promise<Response>((resolve) => {
      finishRequest = resolve;
    });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockReturnValue(pendingRequest));

    renderApp();

    await user.type(screen.getByLabelText('E-mail'), 'cuidadora@ecos.org.br');
    await user.type(screen.getByLabelText('Senha'), 'segredo');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('button', { name: 'Entrando...' })).toBeDisabled();

    finishRequest?.(
      new Response(JSON.stringify({ token: 'valid-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
  });
});
