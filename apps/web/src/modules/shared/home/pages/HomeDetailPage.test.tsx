import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeHome, makePerson, renderSettingsPage } from '../../../../test/settings-fixtures.js';
import { personService } from '../../person/services/person-service.js';
import { homeService } from '../services/home-service.js';
import { HomeDetailPage } from './HomeDetailPage.js';

vi.mock('../services/home-service.js', () => ({
  homeService: {
    get: vi.fn(),
    listPeople: vi.fn(),
    linkPerson: vi.fn(),
    unlinkPerson: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../../person/services/person-service.js', () => ({
  personService: { list: vi.fn() },
}));

const listHomePeople = vi.mocked(homeService.listPeople);
const linkPerson = vi.mocked(homeService.linkPerson);
const unlinkPerson = vi.mocked(homeService.unlinkPerson);

const juliana = makePerson(3, 'Juliana Alves', 3);
const rosa = makePerson(4, 'Rosa Pereira', 6);
const joao = makePerson(6, 'João Pedro', 5);
const lucas = makePerson(7, 'Lucas Gabriel', 5);
const esperanca = makeHome(1, 'Casa Esperança', juliana);

const ROUTE = { path: '/settings/homes/:homeId', at: '/settings/homes/1' };

describe('HomeDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(homeService.get).mockResolvedValue(esperanca);
    listHomePeople.mockResolvedValue([joao, juliana]);
    vi.mocked(personService.list).mockResolvedValue([joao, juliana, lucas, rosa]);
    linkPerson.mockResolvedValue({ message: 'ok' });
    unlinkPerson.mockResolvedValue({ message: 'ok' });
  });

  it('separa acolhidos e equipe, e o responsável não sai da casa', async () => {
    renderSettingsPage(<HomeDetailPage />, { route: ROUTE });

    expect(await screen.findByRole('heading', { name: 'Casa Esperança' })).toBeInTheDocument();
    const sheltered = screen.getByRole('heading', { name: /Acolhidos/ }).closest('section')!;
    expect(within(sheltered).getByText('João Pedro')).toBeInTheDocument();
    const staff = screen.getByRole('heading', { name: /Equipe/ }).closest('section')!;
    expect(within(staff).getByText('Juliana Alves')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover Juliana Alves da casa' })).toBeDisabled();
  });

  it('adiciona várias pessoas de uma vez, só entre quem ainda não está na casa', async () => {
    const user = userEvent.setup();
    renderSettingsPage(<HomeDetailPage />, { route: ROUTE });

    await user.click(await screen.findByRole('button', { name: 'Adicionar pessoas' }));
    const dialog = screen.getByRole('dialog', { name: 'Adicionar à Casa Esperança' });
    expect(within(dialog).queryByRole('checkbox', { name: 'João Pedro' })).toBeNull();

    await user.click(within(dialog).getByRole('checkbox', { name: 'Lucas Gabriel' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Rosa Pereira' }));
    await user.click(within(dialog).getByRole('button', { name: 'Adicionar 2 pessoas' }));

    expect(linkPerson.mock.calls).toEqual([
      [1, 7],
      [1, 4],
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('pergunta antes de remover alguém da casa', async () => {
    const user = userEvent.setup();
    renderSettingsPage(<HomeDetailPage />, { route: ROUTE });

    await user.click(await screen.findByRole('button', { name: 'Remover João Pedro da casa' }));
    const confirmation = screen.getByRole('dialog', { name: 'Remover da casa?' });
    await user.click(within(confirmation).getByRole('button', { name: 'Remover' }));

    expect(unlinkPerson).toHaveBeenCalledWith(1, 6);
  });

  it('quem só lê casas não vê as ações', async () => {
    renderSettingsPage(<HomeDetailPage />, {
      route: ROUTE,
      permissions: ['person:read', 'home:read'],
    });

    expect(await screen.findByRole('heading', { name: 'Casa Esperança' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar pessoas' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Remover/ })).toBeNull();
  });
});
