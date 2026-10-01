import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HomeResponse, Permission } from '@casaecos/shared-types';

import { AuthContext, type AuthContextValue } from '../auth/context/auth-context.js';
import { HomeSelectionProvider } from '../home/context/HomeSelectionProvider.js';
import { useHomeSelection } from '../home/context/use-home-selection.js';
import { homeService } from '../home/services/home-service.js';
import { HomePicker } from './HomePicker.js';

vi.mock('../home/services/home-service.js', () => ({ homeService: { list: vi.fn() } }));

const listHomes = vi.mocked(homeService.list);

function makeHome(id: number, name: string): HomeResponse {
  const createdAt = new Date(2026, 0, 1).toISOString();
  return {
    id,
    name,
    organization: { id: 1, name: 'Ecos da Esperança' },
    responsible: {
      id: 9,
      name: 'Ana',
      role: { id: 3, description: 'Cuidador/Monitor' },
      individualRegistration: null,
      phone: null,
      createdAt,
      updatedAt: createdAt,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function SelectedHome(): React.JSX.Element {
  const { selectedHomeId } = useHomeSelection();
  return <p>casa escolhida: {selectedHomeId ?? 'todas'}</p>;
}

function renderPicker(permissions: Permission[]): void {
  const auth: AuthContextValue = {
    status: 'authenticated',
    user: {
      personId: 1,
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
      <HomeSelectionProvider>
        <HomePicker />
        <SelectedHome />
      </HomeSelectionProvider>
    </AuthContext>,
  );
}

describe('HomePicker', () => {
  beforeEach(() => {
    listHomes.mockResolvedValue([makeHome(1, 'Casa Esperança'), makeHome(2, 'Casa Fé')]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('escolhe a casa para todas as telas, e volta para "Todas as casas"', async () => {
    const user = userEvent.setup();
    renderPicker(['home:read', 'event:read']);
    const picker = screen.getByRole('combobox', { name: 'Casa' });

    await user.selectOptions(picker, await screen.findByRole('option', { name: 'Casa Fé' }));
    expect(screen.getByText('casa escolhida: 2')).toBeInTheDocument();

    await user.selectOptions(picker, 'Todas as casas');
    expect(screen.getByText('casa escolhida: todas')).toBeInTheDocument();
  });

  it('mostra a casa da cuidadora que só tem uma, sem deixar trocar', async () => {
    listHomes.mockResolvedValue([makeHome(1, 'Casa Esperança')]);
    renderPicker(['home:read', 'event:read']);

    expect(await screen.findByRole('option', { name: 'Casa Esperança' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Casa' })).toBeDisabled();
  });

  it('nem busca as casas para quem não tem home:read, como o motorista', () => {
    renderPicker(['event:read']);

    expect(screen.getByRole('combobox', { name: 'Casa' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Todas as casas' })).toBeInTheDocument();
    expect(listHomes).not.toHaveBeenCalled();
  });
});
