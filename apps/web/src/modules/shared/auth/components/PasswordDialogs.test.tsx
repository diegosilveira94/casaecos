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

const listAccounts = vi.mocked(authService.listAccounts);
const resetPassword = vi.mocked(authService.resetPassword);

describe('PasswordDialogs', () => {
  beforeEach(() => {
    listAccounts.mockResolvedValue([
      { personId: 7, personName: 'Maria Silva', email: 'maria@ecos.org' },
      { personId: 9, personName: 'João Santos', email: 'joao@ecos.org' },
    ]);
    resetPassword.mockResolvedValue({ message: 'Senha redefinida com sucesso' });
  });

  it('lista as credenciais e deixa a coordenação redefinir uma senha', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordDialog onClose={vi.fn()} />);

    const person = await screen.findByRole('combobox', { name: 'Pessoa' });
    await user.selectOptions(person, '9');
    await user.type(screen.getByLabelText('Nova senha *'), 'senha-temporaria');
    await user.type(screen.getByLabelText('Confirmar nova senha *'), 'senha-temporaria');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(resetPassword).toHaveBeenCalledWith(9, { password: 'senha-temporaria' });
    expect(await screen.findByText('Senha redefinida com sucesso')).toBeInTheDocument();
  });
});
