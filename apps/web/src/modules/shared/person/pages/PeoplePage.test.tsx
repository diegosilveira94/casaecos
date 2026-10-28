import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeHome,
  makePerson,
  renderSettingsPage,
  ROLES,
  SECRETARY_PERMISSIONS,
} from '../../../../test/settings-fixtures.js';
import { homeService } from '../../home/services/home-service.js';
import { personService } from '../services/person-service.js';
import { PeoplePage } from './PeoplePage.js';

vi.mock('../services/person-service.js', () => ({
  personService: {
    list: vi.fn(),
    listRoles: vi.fn(),
    listHomes: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../../home/services/home-service.js', () => ({
  homeService: { list: vi.fn(), listPeople: vi.fn(), linkPerson: vi.fn(), unlinkPerson: vi.fn() },
}));

const listPeople = vi.mocked(personService.list);
const createPerson = vi.mocked(personService.create);
const linkPerson = vi.mocked(homeService.linkPerson);

const juliana = makePerson(3, 'Juliana Alves', 3, { hasAccount: true, phone: '(47) 99734-5521' });
const carlos = makePerson(4, 'Carlos Lima', 4);
const joao = makePerson(6, 'João Pedro', 5);
const esperanca = makeHome(1, 'Casa Esperança', juliana);

describe('PeoplePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    listPeople.mockResolvedValue([carlos, joao, juliana]);
    vi.mocked(personService.listRoles).mockResolvedValue(ROLES);
    vi.mocked(personService.listHomes).mockResolvedValue([]);
    vi.mocked(homeService.list).mockResolvedValue([esperanca]);
    vi.mocked(homeService.listPeople).mockResolvedValue([juliana, joao]);
    linkPerson.mockResolvedValue({ message: 'ok' });
  });

  it('lista as pessoas com papel, casas e quem acessa o sistema', async () => {
    renderSettingsPage(<PeoplePage />);

    const row = (await screen.findByText('Juliana Alves')).closest('button');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Cuidador/Monitor')).toBeInTheDocument();
    expect(within(row!).getByText('Acessa')).toBeInTheDocument();
    expect(within(row!).getAllByText(/Casa Esperança/).length).toBeGreaterThan(0);

    const driverRow = screen.getByText('Carlos Lima').closest('button');
    expect(within(driverRow!).getAllByText(/Todas as casas/).length).toBeGreaterThan(0);
  });

  it('filtra por nome sem acento e por papel', async () => {
    const user = userEvent.setup();
    renderSettingsPage(<PeoplePage />);
    await screen.findByText('João Pedro');

    await user.type(screen.getByPlaceholderText('Buscar por nome'), 'joao');
    expect(screen.getByText('João Pedro')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Lima')).toBeNull();
    expect(screen.getByText(/1 de 3 pessoas/)).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Buscar por nome'));
    await user.selectOptions(screen.getByLabelText('Papel'), 'Motorista');
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument();
    expect(screen.queryByText('João Pedro')).toBeNull();
  });

  it('pagina de 10 em 10 e troca para 20 por página', async () => {
    const user = userEvent.setup();
    listPeople.mockResolvedValue(
      Array.from({ length: 12 }, (_unused, index) =>
        makePerson(100 + index, `Pessoa ${String(index + 10)}`, 5),
      ),
    );
    renderSettingsPage(<PeoplePage />);

    expect(await screen.findByText('1–10 de 12')).toBeInTheDocument();
    expect(screen.queryByText('Pessoa 21')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(screen.getByText('Pessoa 21')).toBeInTheDocument();
    expect(screen.getByText('11–12 de 12')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Por página'), '20');
    expect(screen.getByText('1–12 de 12')).toBeInTheDocument();
  });

  it('cadastra uma pessoa já vinculada à casa marcada', async () => {
    const user = userEvent.setup();
    createPerson.mockResolvedValue(makePerson(9, 'Maria Clara', 5));
    renderSettingsPage(<PeoplePage />);

    await user.click(await screen.findByRole('button', { name: 'Nova pessoa' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova pessoa' });
    await user.type(within(dialog).getByLabelText('Nome *'), 'Maria Clara');
    await user.click(within(dialog).getByRole('radio', { name: /Acolhido/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Casa Esperança' }));
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar pessoa' }));

    expect(createPerson).toHaveBeenCalledWith({
      name: 'Maria Clara',
      roleId: 5,
      individualRegistration: null,
      phone: null,
    });
    expect(linkPerson).toHaveBeenCalledWith(1, 9);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('pede nome e papel antes de chamar a API', async () => {
    const user = userEvent.setup();
    renderSettingsPage(<PeoplePage />);

    await user.click(await screen.findByRole('button', { name: 'Nova pessoa' }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar pessoa' }));

    expect(screen.getByText('Informe o nome.')).toBeInTheDocument();
    expect(screen.getByText('Escolha o papel.')).toBeInTheDocument();
    expect(createPerson).not.toHaveBeenCalled();
  });

  it('a secretaria não escolhe Coordenador nem troca o papel de quem acessa', async () => {
    const user = userEvent.setup();
    renderSettingsPage(<PeoplePage />, { permissions: SECRETARY_PERMISSIONS });

    await user.click(await screen.findByRole('button', { name: /Juliana Alves/ }));
    const dialog = screen.getByRole('dialog', { name: 'Editar pessoa' });

    expect(within(dialog).getByRole('radio', { name: /Secretário/ })).toBeDisabled();
    expect(
      within(dialog).getByText(
        'Esta pessoa acessa o sistema: só a coordenação troca o papel dela.',
      ),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: /João Pedro/ }));
    expect(screen.getByRole('radio', { name: /Coordenador/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Secretário/ })).toBeEnabled();
  });
});
