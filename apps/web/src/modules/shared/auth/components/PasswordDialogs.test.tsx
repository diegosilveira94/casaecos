import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '../services/auth-service.js';
import { ResetPasswordDialog } from './PasswordDialogs.js';

vi.mock('../services/auth-service.js', () => ({
  authService: {
    listAccounts: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const resetPassword = vi.mocked(authService.resetPassword);

const mariaAccount = {
  id: 1,
  person: { id: 7, name: 'Maria Silva' },
  role: { id: 2, description: 'Secretário' },
  email: 'maria@ecos.org',
  lastLoginAt: null,
};

describe('PasswordDialogs', () => {
  beforeEach(() => {
    resetPassword.mockResolvedValue({ message: 'Senha redefinida com sucesso' });
  });

  it('redefine a senha da conta selecionada', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordDialog account={mariaAccount} onClose={vi.fn()} />);

    expect(screen.getByText(/Maria Silva \(maria@ecos\.org\)/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nova senha *'), 'senha-temporaria');
    await user.type(screen.getByLabelText('Confirmar nova senha *'), 'senha-temporaria');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(resetPassword).toHaveBeenCalledWith(7, { password: 'senha-temporaria' });
    expect(await screen.findByText('Senha redefinida com sucesso')).toBeInTheDocument();
  });
});
