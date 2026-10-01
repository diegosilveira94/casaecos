import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUserResponse, EventResponse, Permission } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../shared/http/api-request-error.js';
import { AuthContext, type AuthContextValue } from '../../shared/auth/context/auth-context.js';
import { HomeSelectionContext } from '../../shared/home/context/home-selection-context.js';
import { setDesktopViewport } from '../../../test/media-query.js';
import { toOffsetIsoString } from '../domain/calendar-dates.js';
import { eventService } from '../services/event-service.js';
import { AgendaPage } from './AgendaPage.js';

vi.mock('../services/event-service.js', () => ({
  eventService: { list: vi.fn(), listAll: vi.fn(), listEventTypes: vi.fn() },
}));

const listAll = vi.mocked(eventService.listAll);
const listEventTypes = vi.mocked(eventService.listEventTypes);
const listUpcoming = vi.mocked(eventService.list);

const SECRETARY_PERMISSIONS: Permission[] = [
  'person:read',
  'person:write',
  'home:read',
  'home:write',
  'event:read',
  'event:write',
];

const secretary: AuthenticatedUserResponse = {
  personId: 1,
  name: 'Maria Silva',
  email: 'maria@ecos.org',
  role: { id: 2, description: 'Secretário' },
  permissions: SECRETARY_PERMISSIONS,
};

const at = (month: number, day: number, hour: number): string =>
  new Date(2026, month, day, hour).toISOString();

function makeEvent(overrides: Partial<EventResponse>): EventResponse {
  return {
    id: 1,
    title: 'Consulta pediátrica',
    description: null,
    startDate: at(8, 30, 9),
    endDate: null,
    address: null,
    eventType: { id: 1, name: 'Consulta médica' },
    home: { id: 1, name: 'Casa Esperança' },
    participants: [],
    createdAt: at(8, 1, 8),
    updatedAt: at(8, 1, 8),
    ...overrides,
  };
}

const consultation = makeEvent({
  id: 1,
  title: 'Consulta pediátrica',
  startDate: at(8, 30, 9),
  endDate: at(8, 30, 10),
  address: 'Rua das Flores, 100',
  description: 'Levar a carteirinha de vacinação.',
  participants: [
    {
      person: { id: 5, name: 'João Pedro' },
      participationType: { id: 2, description: 'Participante' },
    },
    {
      person: { id: 1, name: 'Maria Silva' },
      participationType: { id: 3, description: 'Responsável' },
    },
  ],
});
const therapy = makeEvent({
  id: 2,
  title: 'Sessão com psicóloga',
  startDate: at(8, 30, 14),
  eventType: { id: 3, name: 'Terapia' },
  home: { id: 2, name: 'Casa Fé' },
});
const school = makeEvent({
  id: 3,
  title: 'Reunião na escola',
  startDate: at(8, 15, 8),
  eventType: { id: 2, name: 'Escola' },
});

function renderPage(
  user: AuthenticatedUserResponse = secretary,
  selectedHomeId: number | null = null,
): void {
  const auth: AuthContextValue = {
    status: 'authenticated',
    user,
    login: vi.fn(),
    logout: vi.fn(),
    can: (permission) => user.permissions.includes(permission),
  };
  render(
    <AuthContext value={auth}>
      <HomeSelectionContext
        value={{ homes: [], selectedHomeId, canChooseHome: true, selectHome: vi.fn() }}
      >
        <AgendaPage />
      </HomeSelectionContext>
    </AuthContext>,
  );
}

function dayList(): HTMLElement {
  return screen.getByRole('region', { name: /^Compromissos do dia/ });
}

function lastListAllQuery(): Parameters<typeof eventService.listAll>[0] {
  return listAll.mock.lastCall?.[0];
}

describe('AgendaPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 30, 10, 0));
    listAll.mockResolvedValue([school, consultation, therapy]);
    listEventTypes.mockResolvedValue([
      { id: 1, name: 'Consulta médica' },
      { id: 3, name: 'Terapia' },
    ]);
    listUpcoming.mockResolvedValue({
      items: [consultation, therapy],
      page: 1,
      pageSize: 4,
      total: 2,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('abre no mês atual e lista os compromissos de hoje', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Setembro 2026' })).toBeInTheDocument();
    expect(await within(dayList()).findByText('Consulta pediátrica')).toBeInTheDocument();
    expect(within(dayList()).getByText('Sessão com psicóloga')).toBeInTheDocument();
    expect(within(dayList()).queryByText('Reunião na escola')).not.toBeInTheDocument();
    expect(within(dayList()).getByText('09:00 – 10:00')).toBeInTheDocument();
    expect(within(dayList()).getByText('João Pedro, Maria Silva')).toBeInTheDocument();
    expect(lastListAllQuery()).toEqual({
      from: toOffsetIsoString(new Date(2026, 8, 1)),
      to: toOffsetIsoString(new Date(2026, 9, 1)),
    });
  });

  it('marca hoje como selecionado e conta os compromissos de cada dia', async () => {
    renderPage();

    const today = await screen.findByRole('button', { name: '30 de setembro, 2 compromissos' });
    expect(today).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: '15 de setembro, 1 compromisso' }),
    ).toBeInTheDocument();
  });

  it('troca a lista ao tocar em outro dia, e avisa quando o dia está vazio', async () => {
    const user = userEvent.setup();
    renderPage();
    await within(dayList()).findByText('Consulta pediátrica');

    await user.click(screen.getByRole('button', { name: '15 de setembro, 1 compromisso' }));
    expect(within(dayList()).getByText('Reunião na escola')).toBeInTheDocument();
    expect(within(dayList()).getByRole('heading')).toHaveTextContent('Terça-feira, 15 de setembro');

    await user.click(screen.getByRole('button', { name: '16 de setembro, nenhum compromisso' }));
    expect(within(dayList()).getByText('Nenhum compromisso neste dia.')).toBeInTheDocument();
  });

  it('busca o mês seguinte selecionando o dia 1, e volta para hoje', async () => {
    const user = userEvent.setup();
    renderPage();
    await within(dayList()).findByText('Consulta pediátrica');

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));

    expect(screen.getByRole('heading', { name: 'Outubro 2026' })).toBeInTheDocument();
    expect(lastListAllQuery()).toEqual({
      from: toOffsetIsoString(new Date(2026, 9, 1)),
      to: toOffsetIsoString(new Date(2026, 10, 1)),
    });
    expect(within(dayList()).getByRole('heading')).toHaveTextContent('Quinta-feira, 1 de outubro');

    await user.click(screen.getByRole('button', { name: 'Hoje' }));

    expect(screen.getByRole('heading', { name: 'Setembro 2026' })).toBeInTheDocument();
    expect(within(dayList()).getByRole('heading')).toHaveTextContent(
      'Hoje · quarta-feira, 30 de setembro',
    );
  });

  it('não deixa escolher os dias de fora do mês', async () => {
    renderPage();
    await within(dayList()).findByText('Consulta pediátrica');

    const grid = screen.getByRole('group', { name: 'Dias de Setembro 2026' });
    const outsideDays = within(grid)
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('disabled'));
    expect(outsideDays.map((button) => button.textContent)).toEqual(['30', '31', '1', '2', '3']);
  });

  it('refaz a busca com o tipo escolhido em "Filtros", e tira o filtro em "Todos os tipos"', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Filtros' }));
    const typeFilter = await screen.findByRole('combobox', { name: 'Tipo de compromisso' });
    await user.selectOptions(typeFilter, 'Terapia');
    expect(lastListAllQuery()).toMatchObject({ eventTypeId: 3 });
    expect(screen.getByRole('button', { name: /^Filtros.*1 ativo/ })).toBeInTheDocument();

    await user.selectOptions(typeFilter, 'Todos os tipos');
    expect(lastListAllQuery()).not.toHaveProperty('eventTypeId');
  });

  it('busca só a casa escolhida na sidebar', async () => {
    renderPage(secretary, 2);

    await within(dayList()).findByText('Consulta pediátrica');
    expect(lastListAllQuery()).toMatchObject({ homeId: 2 });
  });

  it('mostra "Novo Compromisso" e "Exportar" ainda sem ação', async () => {
    renderPage();
    await within(dayList()).findByText('Consulta pediátrica');

    expect(screen.getByRole('button', { name: 'Novo Compromisso' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Exportar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('esconde "Novo Compromisso" de quem não pode criar compromisso', async () => {
    renderPage({
      ...secretary,
      role: { id: 3, description: 'Cuidador/Monitor' },
      permissions: ['home:read', 'event:read'],
    });
    await within(dayList()).findByText('Consulta pediátrica');

    expect(screen.queryByRole('button', { name: 'Novo Compromisso' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
  });

  it('mostra o erro da API e tenta de novo', async () => {
    const user = userEvent.setup();
    listAll.mockRejectedValueOnce(
      new ApiRequestError(null, { message: 'Não foi possível conectar ao servidor' }),
    );
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor',
    );
    expect(screen.getByRole('group', { name: 'Dias de Setembro 2026' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await within(dayList()).findByText('Consulta pediátrica')).toBeInTheDocument();
    expect(listAll).toHaveBeenCalledTimes(2);
  });

  it('abre o detalhe do compromisso e fecha com Esc', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await within(dayList()).findByRole('button', { name: /Consulta pediátrica/ }));

    const dialog = screen.getByRole('dialog', { name: 'Consulta pediátrica' });
    expect(within(dialog).getByText('Rua das Flores, 100')).toBeInTheDocument();
    expect(within(dialog).getByText('Levar a carteirinha de vacinação.')).toBeInTheDocument();
    expect(within(dialog).getByText('· Responsável')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Fechar' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(dayList()).getByRole('button', { name: /Consulta pediátrica/ })).toHaveFocus();
  });

  it('não mostra endereço nem descrição quando o compromisso não tem', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await within(dayList()).findByRole('button', { name: /Sessão com psicóloga/ }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Sessão com psicóloga' });
    expect(within(dialog).queryByText('Endereço')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Descrição')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Nenhum participante')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('no desktop', () => {
    beforeEach(() => {
      setDesktopViewport(true);
    });

    it('mostra os próximos compromissos a partir de agora, com os mesmos filtros', async () => {
      renderPage(secretary, 2);

      const panel = await screen.findByRole('region', { name: 'Próximos compromissos' });
      expect(await within(panel).findByText('Sessão com psicóloga')).toBeInTheDocument();
      expect(within(panel).getAllByText('30/09/2026')).toHaveLength(2);
      expect(listUpcoming).toHaveBeenLastCalledWith({
        from: toOffsetIsoString(new Date(2026, 8, 30, 10, 0)),
        pageSize: 4,
        homeId: 2,
      });
      expect(within(panel).getByRole('button', { name: 'Ver todos' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('abre o dia numa janela pelo "+N compromissos", e dali o compromisso', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: '+1 compromisso' }));
      const day = screen.getByRole('dialog', { name: 'Hoje · quarta-feira, 30 de setembro' });
      await user.click(within(day).getByRole('button', { name: /Sessão com psicóloga/ }));

      expect(screen.getByRole('dialog', { name: 'Sessão com psicóloga' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog', { name: /30 de setembro/ })).not.toBeInTheDocument();
    });

    it('abre o compromisso pelo bloco da grade', async () => {
      const user = userEvent.setup();
      renderPage();

      const grid = await screen.findByRole('group', { name: 'Dias de Setembro 2026' });
      await user.click(await within(grid).findByRole('button', { name: /Reunião na escola/ }));

      expect(screen.getByRole('dialog', { name: 'Reunião na escola' })).toBeInTheDocument();
    });

    it('avisa o erro da busca do mês acima da grade', async () => {
      listAll.mockRejectedValueOnce(new ApiRequestError(500, { message: 'Erro interno' }));
      renderPage();

      expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno');
    });
  });
});
