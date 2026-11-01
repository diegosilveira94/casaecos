import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventResponse, PersonResponse } from '@casaecos/shared-types';

import { ApiRequestError } from '../../../shared/http/api-request-error.js';
import { personService } from '../../shared/person/services/person-service.js';
import { toOffsetIsoString } from '../domain/calendar-dates.js';
import { whatsAppLink } from '../domain/whatsapp-link.js';
import { eventService } from '../services/event-service.js';
import { SendAgendaDialog } from './SendAgendaDialog.js';

vi.mock('../services/event-service.js', () => ({
  eventService: { listAll: vi.fn() },
}));
vi.mock('../../shared/person/services/person-service.js', () => ({
  personService: { list: vi.fn() },
}));

const listAll = vi.mocked(eventService.listAll);
const listPeople = vi.mocked(personService.list);

const TODAY = new Date(2026, 10, 4);

function makePerson(
  id: number,
  name: string,
  roleId: number,
  role: string,
  phone: string | null = null,
): PersonResponse {
  return {
    id,
    name,
    role: { id: roleId, description: role },
    individualRegistration: null,
    phone,
    hasAccount: false,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  };
}

const bia = makePerson(10, 'Bia Ramos', 5, 'Acolhido');
const carlos = makePerson(21, 'Carlos Lima', 4, 'Motorista', '(47) 90000-0003');
const joana = makePerson(22, 'Joana Reis', 3, 'Cuidador');
const paulo = makePerson(23, 'Paulo Sá', 4, 'Motorista', '1234');

const school: EventResponse = {
  id: 1,
  title: 'Escola Aurora',
  description: null,
  startDate: new Date(2026, 10, 5, 7, 30).toISOString(),
  endDate: null,
  address: null,
  eventType: { id: 2, name: 'Escola' },
  home: { id: 1, name: 'Casa 1' },
  participants: [
    {
      person: { id: bia.id, name: bia.name },
      participationType: { id: 2, description: 'Participante' },
    },
    {
      person: { id: carlos.id, name: carlos.name },
      participationType: { id: 4, description: 'Motorista' },
    },
  ],
  createdAt: '2026-11-01T08:00:00.000Z',
  updatedAt: '2026-11-01T08:00:00.000Z',
};

function renderDialog(onClose = vi.fn()): ReturnType<typeof vi.fn> {
  render(<SendAgendaDialog today={TODAY} onClose={onClose} />);
  return onClose;
}

function whatsAppHref(): string | null {
  return screen.getByRole('link', { name: 'Abrir no WhatsApp' }).getAttribute('href');
}

describe('SendAgendaDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 4, 15, 0));
    listAll.mockResolvedValue([school]);
    listPeople.mockResolvedValue([bia, carlos, joana, paulo]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('abre na mensagem geral de amanhã, sem aplicar filtro de casa', async () => {
    renderDialog();

    expect(await screen.findByText(/BIA: Escola Aurora/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Geral' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Amanhã' })).toBeChecked();
    expect(listAll).toHaveBeenCalledWith({
      from: toOffsetIsoString(new Date(2026, 10, 5)),
      to: toOffsetIsoString(new Date(2026, 10, 6)),
    });
  });

  it('abre o WhatsApp sem número para escolher o grupo', async () => {
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    const message = [
      'Boa tarde! 🔴 *AGENDA DE QUINTA-FEIRA 05/11/26*',
      '',
      '💛 *CASA 1*',
      '➡️ Às 07:30',
      '* BIA: Escola Aurora',
    ].join('\n');
    expect(whatsAppHref()).toBe(whatsAppLink(message));
  });

  it('busca de novo ao trocar o período e avisa quando não há compromissos', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    listAll.mockResolvedValue([]);
    await user.click(screen.getByRole('radio', { name: 'Hoje' }));

    expect(await screen.findByText('Não há compromissos em: hoje.')).toBeInTheDocument();
    expect(listAll).toHaveBeenLastCalledWith({
      from: toOffsetIsoString(new Date(2026, 10, 4)),
      to: toOffsetIsoString(new Date(2026, 10, 5)),
    });
    expect(screen.getByRole('button', { name: 'Abrir no WhatsApp' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copiar mensagem' })).toBeDisabled();
  });

  it('oferece a equipe sem acolhidos e desabilita quem não tem telefone válido', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('radio', { name: 'Uma pessoa' }));

    expect(screen.getByText('Selecione a pessoa para ver a mensagem.')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Bia Ramos/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Carlos Lima · Motorista' })).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Joana Reis · sem telefone' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Paulo Sá · telefone inválido' })).toBeDisabled();
  });

  it('abre direto a conversa da pessoa escolhida', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('radio', { name: 'Uma pessoa' }));
    await user.selectOptions(screen.getByLabelText('Pessoa'), String(carlos.id));

    expect(screen.getByText(/Boa tarde, Carlos!/)).toBeInTheDocument();
    expect(whatsAppHref()).toMatch(
      /^https:\/\/api\.whatsapp\.com\/send\?phone=5547900000003&text=/,
    );
  });

  it('avisa quando a pessoa não tem compromissos no período', async () => {
    const user = userEvent.setup();
    listPeople.mockResolvedValue([
      bia,
      carlos,
      makePerson(24, 'Rita Nunes', 4, 'Motorista', '47900000004'),
    ]);
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('radio', { name: 'Uma pessoa' }));
    await user.selectOptions(screen.getByLabelText('Pessoa'), '24');

    expect(screen.getByText('Rita Nunes não tem compromissos em: amanhã.')).toBeInTheDocument();
  });

  it('personaliza a mensagem: link com o texto editado e opções travadas', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('button', { name: 'Personalizar mensagem' }));
    const editor = screen.getByRole('textbox', { name: 'Mensagem' });
    await user.clear(editor);
    await user.type(editor, 'Texto próprio');

    expect(whatsAppHref()).toBe(whatsAppLink('Texto próprio'));
    expect(screen.getByRole('radio', { name: 'Hoje' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Motoristas' })).toBeDisabled();
  });

  it('não deixa enviar a mensagem personalizada vazia', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('button', { name: 'Personalizar mensagem' }));
    await user.clear(screen.getByRole('textbox', { name: 'Mensagem' }));

    expect(screen.getByRole('button', { name: 'Abrir no WhatsApp' })).toBeDisabled();
  });

  it('pede confirmação para voltar ao modelo só se o texto mudou', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('button', { name: 'Personalizar mensagem' }));
    await user.click(screen.getByRole('button', { name: 'Voltar ao modelo' }));
    expect(screen.queryByText('Descartar alterações?')).not.toBeInTheDocument();
    expect(screen.getByText('A mensagem voltou ao modelo.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Personalizar mensagem' }));
    await user.type(screen.getByRole('textbox', { name: 'Mensagem' }), ' extra');
    await user.click(screen.getByRole('button', { name: 'Voltar ao modelo' }));
    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(screen.queryByRole('textbox', { name: 'Mensagem' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Hoje' })).toBeEnabled();
  });

  it('pede confirmação ao fechar com texto editado', async () => {
    const user = userEvent.setup();
    const onClose = renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('button', { name: 'Personalizar mensagem' }));
    await user.type(screen.getByRole('textbox', { name: 'Mensagem' }), ' extra');
    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(screen.getByRole('textbox', { name: 'Mensagem' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fecha direto quando nada foi editado', async () => {
    const user = userEvent.setup();
    const onClose = renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('copia o texto que será enviado', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('button', { name: 'Copiar mensagem' }));

    expect(writeText.mock.lastCall?.[0]).toContain('* BIA: Escola Aurora');
    expect(await screen.findByText(/Mensagem copiada/)).toBeInTheDocument();
  });

  it('explica quando o navegador não deixa copiar', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('negado'));
    renderDialog();
    await screen.findByText(/BIA: Escola Aurora/);

    await user.click(screen.getByRole('button', { name: 'Copiar mensagem' }));

    expect(await screen.findByText(/O texto ficou selecionado/)).toBeInTheDocument();
  });

  it('mostra a falha da busca e tenta de novo', async () => {
    const user = userEvent.setup();
    listAll.mockRejectedValueOnce(new ApiRequestError(500, { message: 'Erro do servidor' }));
    renderDialog();

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro do servidor');

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => {
      expect(screen.getByText(/BIA: Escola Aurora/)).toBeInTheDocument();
    });
  });
});
