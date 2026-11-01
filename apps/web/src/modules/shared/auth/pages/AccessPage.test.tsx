import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserAccountListItemResponse } from '@casaecos/shared-types';

import { makePerson, renderSettingsPage, ROLES } from '../../../../test/settings-fixtures.js';
import { personService } from '../../person/services/person-service.js';
import { authService } from '../services/auth-service.js';
import { AccessPage } from './AccessPage.js';

vi.mock('../services/auth-service.js', () => ({
  authService: { listAccounts: vi.fn(), createAccount: vi.fn() },
}));
vi.mock('../../person/services/person-service.js', () => ({
  personService: { list: vi.fn(), listRoles: vi.fn(), update: vi.fn() },
}));

const createAccount = vi.mocked(authService.createAccount);
const updatePerson = vi.mocked(personService.update);

function account(
  id: number,
  personId: number,
  name: string,
  roleId: number,
  email: string,
): UserAccountListItemResponse {
  return {
    id,
    person: { id: personId, name },
    role: ROLES.find((role) => role.id === roleId)!,
    email,
    lastLoginAt: null,
  };
}

const ana = account(1, 1, 'Ana Ribeiro', 1, 'ana@ecos.org');
const juliana = account(2, 3, 'Juliana Alves', 3, 'juliana@ecos.org');
const rosa = makePerson(4, 'Rosa Pereira', 6);
const joao = makePerson(6, 'João Pedro', 5);

describe('AccessPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authService.listAccounts).mockResolvedValue([ana, juliana]);
    vi.mocked(personService.list).mockResolvedValue([
      makePerson(1, 'Ana Ribeiro', 1, { hasAccount: true }),
      makePerson(3, 'Juliana Alves', 3, { hasAccount: true }),
      rosa,
      joao,
    ]);
    vi.mocked(personService.listRoles).mockResolvedValue(ROLES);
    createAccount.mockResolvedValue({
      id: 9,
      personId: 4,
      email: 'rosa@ecos.org',
      lastLoginAt: null,
      createdAt: '2026-10-27T10:00:00.000Z',
      updatedAt: '2026-10-27T10:00:00.000Z',
    });
    updatePerson.mockResolvedValue(makePerson(3, 'Juliana Alves', 2, { hasAccount: true }));
  });

  it('lista quem acessa, com papel e "Nunca entrou"', async () => {
    renderSettingsPage(<AccessPage />);

    const row = (await screen.findByText('Juliana Alves')).closest('.record-row')!;
    expect(within(row as HTMLElement).getByText('Cuidador/Monitor')).toBeInTheDocument();
    expect(within(row as HTMLElement).getAllByText(/Nunca entrou/).length).toBeGreaterThan(0);
  });

  it('dá acesso só à equipe sem credencial e mostra a senha uma vez', async () => {
    const user = userEvent.setup();
    renderSettingsPage(<AccessPage />);

    await user.click(await screen.findByRole('button', { name: 'Dar acesso' }));
    const dialog = screen.getByRole('dialog', { name: 'Dar acesso ao sistema' });
    const personSelect = within(dialog).getByLabelText('Pessoa *');
    expect(
      within(personSelect)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Escolha da equipe', 'Rosa Pereira · Colaborador']);

    await user.selectOptions(personSelect, 'Rosa Pereira · Colaborador');
    await user.type(within(dialog).getByLabelText('E-mail *'), 'rosa@ecos.org');
    const password = within(dialog).getByLabelText<HTMLInputElement>('Senha provisória *').value;
    await user.click(within(dialog).getByRole('button', { name: 'Dar acesso' }));

    expect(createAccount).toHaveBeenCalledWith({ personId: 4, email: 'rosa@ecos.org', password });
    const created = screen.getByRole('dialog', { name: 'Acesso criado' });
    expect(within(created).getByText(password)).toBeInTheDocument();
  });

  it('troca o papel de outra pessoa, mas não o da própria coordenadora', async () => {
    const user = userEvent.setup();
    renderSettingsPage(<AccessPage />, { personId: 1 });

    await screen.findByText('Juliana Alves');
    const [ownButton, otherButton] = screen.getAllByRole('button', { name: 'Trocar papel' });
    expect(ownButton).toBeDisabled();

    await user.click(otherButton!);
    const dialog = screen.getByRole('dialog', { name: 'Trocar papel' });
    expect(within(dialog).queryByRole('radio', { name: /Acolhido/ })).toBeNull();
    await user.click(within(dialog).getByRole('radio', { name: /Secretário/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Trocar papel' }));

    expect(updatePerson).toHaveBeenCalledWith(3, { roleId: 2 });
  });
});
