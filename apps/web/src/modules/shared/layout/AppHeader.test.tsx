import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Permission } from '@casaecos/shared-types';

import { AuthContext, type AuthContextValue } from '../auth/context/auth-context.js';
import { AppHeader } from './AppHeader.js';

vi.mock('../auth/services/auth-service.js', () => ({
  authService: { listAccounts: vi.fn(() => new Promise(() => undefined)) },
}));

function renderHeader(permissions: Permission[]): void {
  const auth: AuthContextValue = {
    status: 'authenticated',
    user: {
      personId: 7,
      name: 'Maria Silva',
      email: 'maria@ecos.org',
      role: { id: 2, description: 'Secretário' },
      permissions,
    },
    login: vi.fn(),
    logout: vi.fn(),
    can: (permission) => permissions.includes(permission),
  };
  render(
    <AuthContext value={auth}>
      <AppHeader isMenuOpen onToggleMenu={vi.fn()} />
    </AuthContext>,
  );
}

describe('AppHeader', () => {
  it('não oferece alteração de senha para quem não gerencia contas', async () => {
    const user = userEvent.setup();
    renderHeader(['event:read']);

    await user.click(screen.getByRole('button', { name: /Maria Silva/i }));
    expect(screen.queryByRole('menuitem', { name: 'Redefinir senha' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
  });

  it('oferece a redefinição de senha somente a quem gerencia contas', async () => {
    const user = userEvent.setup();
    renderHeader(['account:manage']);

    await user.click(screen.getByRole('button', { name: /Maria Silva/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Redefinir senha' }));

    expect(screen.getByRole('dialog', { name: 'Redefinir senha' })).toBeInTheDocument();
  });
});
