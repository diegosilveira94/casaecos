import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AuthenticatedUserResponse,
  EventResponse,
  HomeResponse,
  Permission,
  PersonResponse,
} from '@casaecos/shared-types';

import { ApiRequestError } from '../../../shared/http/api-request-error.js';
import { AuthContext, type AuthContextValue } from '../../shared/auth/context/auth-context.js';
import { HomeSelectionContext } from '../../shared/home/context/home-selection-context.js';
import { homeService } from '../../shared/home/services/home-service.js';
import { personService } from '../../shared/person/services/person-service.js';
import { setDesktopViewport } from '../../../test/media-query.js';
import { toOffsetIsoString } from '../domain/calendar-dates.js';
import { eventService } from '../services/event-service.js';
import { AgendaPage } from './AgendaPage.js';

vi.mock('../services/event-service.js', () => ({
  eventService: {
    list: vi.fn(),
    listAll: vi.fn(),
    listEventTypes: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addParticipant: vi.fn(),
    updateParticipant: vi.fn(),
    removeParticipant: vi.fn(),
  },
}));
vi.mock('../../shared/home/services/home-service.js', () => ({
  homeService: { listPeople: vi.fn() },
}));
vi.mock('../../shared/person/services/person-service.js', () => ({
  personService: { listByRole: vi.fn() },
}));

const listAll = vi.mocked(eventService.listAll);
const listEventTypes = vi.mocked(eventService.listEventTypes);
const listEvents = vi.mocked(eventService.list);
const createEvent = vi.mocked(eventService.create);
const updateEvent = vi.mocked(eventService.update);
const deleteEvent = vi.mocked(eventService.delete);
const addParticipant = vi.mocked(eventService.addParticipant);
const removeParticipant = vi.mocked(eventService.removeParticipant);
const listHomePeople = vi.mocked(homeService.listPeople);
const listPeopleByRole = vi.mocked(personService.listByRole);

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

function makePerson(id: number, name: string, roleId: number, role: string): PersonResponse {
  return {
    id,
    name,
    role: { id: roleId, description: role },
    individualRegistration: null,
    phone: null,
    hasAccount: false,
    createdAt: at(8, 1, 8),
    updatedAt: at(8, 1, 8),
  };
}

const anaSouza = makePerson(2, 'Ana Souza', 3, 'Cuidador/Monitor');
const joaoPedro = makePerson(5, 'João Pedro', 5, 'Acolhido');
// Linked to no home, like the drivers of the organization.
const carlosLima = makePerson(4, 'Carlos Lima', 4, 'Motorista');

function makeHome(id: number, name: string): HomeResponse {
  return {
    id,
    name,
    organization: { id: 1, name: 'Ecos da Esperança' },
    responsible: anaSouza,
    createdAt: at(8, 1, 8),
    updatedAt: at(8, 1, 8),
  };
}

const homes = [makeHome(1, 'Casa Esperança'), makeHome(2, 'Casa Fé')];

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
        value={{
          homes,
          selectedHomeId,
          canChooseHome: true,
          selectHome: vi.fn(),
          reloadHomes: vi.fn(),
        }}
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
    setDesktopViewport(false);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 30, 10, 0));
    listAll.mockResolvedValue([school, consultation, therapy]);
    listEventTypes.mockResolvedValue([
      { id: 1, name: 'Consulta médica' },
      { id: 3, name: 'Terapia' },
    ]);
    listEvents.mockResolvedValue({
      items: [consultation, therapy],
      page: 1,
      pageSize: 4,
      total: 2,
    });
    listHomePeople.mockResolvedValue([anaSouza, joaoPedro]);
    listPeopleByRole.mockResolvedValue([carlosLima]);
    addParticipant.mockResolvedValue({ message: 'ok' });
    removeParticipant.mockResolvedValue({ message: 'ok' });
    deleteEvent.mockResolvedValue({ message: 'ok' });
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

  it('mostra a semana como lista agrupada no celular e busca só o período visível', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Semana' }));

    const list = await screen.findByRole('region', { name: 'Compromissos da semana' });
    expect(within(list).getByText('Consulta pediátrica')).toBeInTheDocument();
    expect(within(list).getByText('Sessão com psicóloga')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true');
    expect(listEvents).toHaveBeenLastCalledWith({
      from: toOffsetIsoString(new Date(2026, 8, 27)),
      to: toOffsetIsoString(new Date(2026, 9, 4)),
      pageSize: 200,
    });
  });

  it('mostra e navega o dia no celular com uma busca por dia', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Dia' }));

    expect(
      await screen.findByRole('heading', { name: 'Quarta-feira, 30 de setembro de 2026' }),
    ).toBeInTheDocument();
    expect(within(dayList()).getByText('Consulta pediátrica')).toBeInTheDocument();
    expect(listEvents).toHaveBeenLastCalledWith({
      from: toOffsetIsoString(new Date(2026, 8, 30)),
      to: toOffsetIsoString(new Date(2026, 9, 1)),
      pageSize: 200,
    });

    await user.click(screen.getByRole('button', { name: 'Próximo dia' }));

    expect(
      screen.getByRole('heading', { name: 'Quinta-feira, 1 de outubro de 2026' }),
    ).toBeInTheDocument();
    expect(listEvents).toHaveBeenLastCalledWith({
      from: toOffsetIsoString(new Date(2026, 9, 1)),
      to: toOffsetIsoString(new Date(2026, 9, 2)),
      pageSize: 200,
    });
  });

  it('mostra "Exportar" ainda sem ação', async () => {
    renderPage();
    await within(dayList()).findByText('Consulta pediátrica');

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
    expect(within(dialog).getByText('Nenhuma pessoa envolvida')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('formulário de compromisso', () => {
    const openNewForm = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
      await within(dayList()).findByText('Consulta pediátrica');
      await user.click(screen.getByRole('button', { name: 'Novo Compromisso' }));
      return screen.getByRole('dialog', { name: 'Novo compromisso' });
    };

    const openEditForm = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
      await user.click(
        await within(dayList()).findByRole('button', { name: /Consulta pediátrica/ }),
      );
      const details = screen.getByRole('dialog', { name: 'Consulta pediátrica' });
      await user.click(within(details).getByRole('button', { name: 'Editar' }));
      return screen.getByRole('dialog', { name: 'Editar compromisso' });
    };

    it('cria o compromisso com as pessoas e mostra o dia dele na agenda', async () => {
      const user = userEvent.setup();
      const created = makeEvent({ id: 9, title: 'Vacinação', startDate: at(9, 5, 9) });
      createEvent.mockResolvedValue(created);
      renderPage();
      const form = await openNewForm(user);

      await user.type(within(form).getByLabelText(/^Título/), 'Vacinação');
      await user.click(within(form).getByRole('radio', { name: 'Consulta médica' }));
      const startDay = within(form).getByLabelText(/^Data/);
      expect(startDay).toHaveValue('2026-09-30');
      await user.clear(startDay);
      await user.type(startDay, '2026-10-05');
      await user.type(within(form).getByLabelText(/^Início/), '09:00');
      await user.selectOptions(within(form).getByLabelText(/^Casa/), 'Casa Fé');
      await user.click(await within(form).findByRole('checkbox', { name: 'João Pedro' }));
      await user.selectOptions(within(form).getByLabelText('Responsável'), 'Ana Souza');
      await user.selectOptions(within(form).getByLabelText('Motorista'), 'Carlos Lima');
      expect(listPeopleByRole).toHaveBeenCalledWith(4);
      expect(
        within(within(form).getByLabelText('Motorista')).queryByRole('option', {
          name: 'Ana Souza',
        }),
      ).not.toBeInTheDocument();
      await user.click(within(form).getByRole('button', { name: 'Salvar compromisso' }));

      expect(await screen.findByRole('heading', { name: 'Outubro 2026' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(listHomePeople).toHaveBeenLastCalledWith(2);
      expect(createEvent).toHaveBeenCalledWith({
        title: 'Vacinação',
        eventTypeId: 1,
        homeId: 2,
        startDate: toOffsetIsoString(new Date(2026, 9, 5, 9, 0)),
        endDate: null,
        address: null,
        description: null,
      });
      expect(addParticipant.mock.calls).toEqual([
        [9, 5, { participationTypeId: 2 }],
        [9, 2, { participationTypeId: 3 }],
        [9, 4, { participationTypeId: 4 }],
      ]);
      expect(within(dayList()).getByRole('heading')).toHaveTextContent(
        'Segunda-feira, 5 de outubro',
      );
    });

    it('já vem com a casa escolhida na sidebar', async () => {
      const user = userEvent.setup();
      renderPage(secretary, 2);
      const form = await openNewForm(user);

      expect(within(form).getByLabelText(/^Casa/)).toHaveValue('2');
    });

    it('aponta os campos obrigatórios em branco e não salva', async () => {
      const user = userEvent.setup();
      renderPage();
      const form = await openNewForm(user);

      await user.click(within(form).getByRole('button', { name: 'Salvar compromisso' }));

      expect(within(form).getByText('Informe o título.')).toBeInTheDocument();
      expect(within(form).getByText('Escolha o tipo de compromisso.')).toBeInTheDocument();
      expect(within(form).getByText('Informe o horário.')).toBeInTheDocument();
      expect(within(form).getByText('Escolha a casa.')).toBeInTheDocument();
      expect(within(form).getByLabelText(/^Título/)).toHaveAttribute('aria-invalid', 'true');
      expect(createEvent).not.toHaveBeenCalled();
    });

    it('fecha direto sem alterações, e pede confirmação quando há alterações', async () => {
      const user = userEvent.setup();
      renderPage();
      let form = await openNewForm(user);

      await user.click(within(form).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      form = await openNewForm(user);
      await user.type(within(form).getByLabelText(/^Título/), 'Vacinação');
      await user.keyboard('{Escape}');

      const confirmation = screen.getByRole('dialog', { name: 'Descartar alterações?' });
      await user.click(within(confirmation).getByRole('button', { name: 'Continuar editando' }));
      expect(screen.getByRole('dialog', { name: 'Novo compromisso' })).toBeInTheDocument();
      expect(within(form).getByLabelText(/^Título/)).toHaveValue('Vacinação');

      await user.click(within(form).getByRole('button', { name: 'Cancelar' }));
      await user.click(
        within(screen.getByRole('dialog', { name: 'Descartar alterações?' })).getByRole('button', {
          name: 'Descartar',
        }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('edita pelo detalhe do compromisso, mandando só as pessoas que mudaram', async () => {
      const user = userEvent.setup();
      updateEvent.mockResolvedValue({ ...consultation, title: 'Consulta de retorno' });
      renderPage();
      const form = await openEditForm(user);

      const title = within(form).getByLabelText(/^Título/);
      expect(title).toHaveValue('Consulta pediátrica');
      expect(within(form).getByRole('radio', { name: 'Consulta médica' })).toBeChecked();
      expect(within(form).getByLabelText(/^Início/)).toHaveValue('09:00');
      expect(within(form).getByLabelText(/^Término/)).toHaveValue('10:00');
      await user.clear(title);
      await user.type(title, 'Consulta de retorno');
      expect(await within(form).findByRole('checkbox', { name: 'João Pedro' })).toBeChecked();
      const responsible = within(form).getByLabelText('Responsável');
      expect(within(responsible).getByRole('option', { name: 'Maria Silva' })).toHaveProperty(
        'selected',
        true,
      );
      await user.selectOptions(responsible, 'Ninguém');
      await user.click(within(form).getByRole('button', { name: 'Salvar alterações' }));

      expect(await within(dayList()).findByText('Consulta pediátrica')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(updateEvent).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: 'Consulta de retorno',
          endDate: toOffsetIsoString(new Date(2026, 8, 30, 10, 0)),
          address: 'Rua das Flores, 100',
        }),
      );
      expect(removeParticipant).toHaveBeenCalledWith(1, 1);
      expect(addParticipant).not.toHaveBeenCalled();
      expect(listAll).toHaveBeenCalledTimes(2);
    });

    it('pede confirmação ao trocar a casa e tira quem é só da casa antiga', async () => {
      const user = userEvent.setup();
      const mariaClara = makePerson(7, 'Maria Clara', 5, 'Acolhido');
      listHomePeople.mockImplementation((homeId) =>
        Promise.resolve(homeId === 2 ? [mariaClara] : [anaSouza, joaoPedro]),
      );
      updateEvent.mockResolvedValue(consultation);
      renderPage();
      const form = await openEditForm(user);
      const home = within(form).getByLabelText(/^Casa/);
      expect(await within(form).findByRole('checkbox', { name: 'João Pedro' })).toBeChecked();

      await user.selectOptions(home, 'Casa Fé');
      const confirmation = await screen.findByRole('dialog', { name: 'Trocar a casa?' });
      expect(confirmation).toHaveTextContent(
        'Trocar a casa remove os acolhidos já vinculados. Continuar?',
      );
      await user.click(within(confirmation).getByRole('button', { name: 'Manter a casa' }));
      expect(home).toHaveValue('1');
      expect(within(form).getByRole('checkbox', { name: 'João Pedro' })).toBeChecked();

      await user.selectOptions(home, 'Casa Fé');
      await user.click(
        within(await screen.findByRole('dialog', { name: 'Trocar a casa?' })).getByRole('button', {
          name: 'Trocar a casa',
        }),
      );
      expect(home).toHaveValue('2');
      expect(await within(form).findByRole('checkbox', { name: 'Maria Clara' })).not.toBeChecked();
      expect(within(form).queryByRole('checkbox', { name: 'João Pedro' })).not.toBeInTheDocument();

      await user.click(within(form).getByRole('button', { name: 'Salvar alterações' }));

      expect(await within(dayList()).findByText('Consulta pediátrica')).toBeInTheDocument();
      expect(updateEvent).toHaveBeenCalledWith(1, expect.objectContaining({ homeId: 2 }));
      // Maria Silva is of neither home: she stays as the responsible one.
      expect(removeParticipant.mock.calls).toEqual([[1, 5]]);
    });

    it('mostra o erro da API e mantém o formulário aberto', async () => {
      const user = userEvent.setup();
      updateEvent.mockRejectedValue(
        new ApiRequestError(null, { message: 'Não foi possível conectar ao servidor' }),
      );
      renderPage();
      const form = await openEditForm(user);

      await user.click(within(form).getByRole('button', { name: 'Salvar alterações' }));

      expect(await within(form).findByRole('alert')).toHaveTextContent(
        'Não foi possível conectar ao servidor',
      );
      expect(within(form).getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
    });

    it('exclui depois de confirmar', async () => {
      const user = userEvent.setup();
      renderPage();
      const form = await openEditForm(user);

      await user.click(within(form).getByRole('button', { name: 'Excluir' }));
      const confirmation = screen.getByRole('dialog', { name: 'Excluir compromisso?' });
      expect(confirmation).toHaveTextContent(
        'Consulta pediátrica será excluído da agenda. Essa ação não pode ser desfeita.',
      );

      await user.click(within(confirmation).getByRole('button', { name: 'Manter compromisso' }));
      expect(deleteEvent).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog', { name: 'Editar compromisso' })).toBeInTheDocument();

      await user.click(within(form).getByRole('button', { name: 'Excluir' }));
      await user.click(
        within(screen.getByRole('dialog', { name: 'Excluir compromisso?' })).getByRole('button', {
          name: 'Excluir',
        }),
      );

      expect(await within(dayList()).findByText('Consulta pediátrica')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(deleteEvent).toHaveBeenCalledWith(1);
      expect(listAll).toHaveBeenCalledTimes(2);
    });

    it('não oferece "Editar" a quem não pode alterar compromissos', async () => {
      const user = userEvent.setup();
      renderPage({
        ...secretary,
        role: { id: 3, description: 'Cuidador/Monitor' },
        permissions: ['home:read', 'event:read'],
      });

      await user.click(
        await within(dayList()).findByRole('button', { name: /Consulta pediátrica/ }),
      );

      const details = screen.getByRole('dialog', { name: 'Consulta pediátrica' });
      expect(within(details).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    });
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
      expect(listEvents).toHaveBeenLastCalledWith({
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

    it('mostra a grade semanal por horário e abre um dia pelo cabeçalho', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: 'Semana' }));

      const grid = await screen.findByRole('group', { name: /^Semana de / });
      expect(within(grid).getByRole('button', { name: /Consulta pediátrica/ })).toBeInTheDocument();
      expect(listEvents).toHaveBeenCalledWith({
        from: toOffsetIsoString(new Date(2026, 8, 27)),
        to: toOffsetIsoString(new Date(2026, 9, 4)),
        pageSize: 200,
      });

      await user.click(screen.getByRole('button', { name: 'Ver dia 30' }));

      expect(
        await screen.findByRole('group', { name: 'Quarta-feira, 30 de setembro de 2026' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Dia' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('avisa o erro da busca do mês acima da grade', async () => {
      listAll.mockRejectedValueOnce(new ApiRequestError(500, { message: 'Erro interno' }));
      renderPage();

      expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno');
    });
  });
});
