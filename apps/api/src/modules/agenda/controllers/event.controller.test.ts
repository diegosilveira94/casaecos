import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  EventParticipantRequest,
  EventResponse,
  EventTypeResponse,
  Paginated,
  ParticipationTypeResponse,
} from '@casaecos/shared-types';

import type { AccessScope } from '../../shared/auth/domain/access-scope.js';
import type { ListEventsRequest } from '../services/event.service.js';

type ParticipantWrite = (
  eventId: number,
  personId: number,
  request: EventParticipantRequest,
  scope: AccessScope,
) => Promise<void>;

const {
  listEvents,
  listEventTypes,
  listParticipationTypes,
  addParticipant,
  updateParticipant,
  removeParticipant,
} = vi.hoisted(() => ({
  listEvents:
    vi.fn<(request: ListEventsRequest, scope: AccessScope) => Promise<Paginated<EventResponse>>>(),
  listEventTypes: vi.fn<() => Promise<EventTypeResponse[]>>(),
  listParticipationTypes: vi.fn<() => Promise<ParticipationTypeResponse[]>>(),
  addParticipant: vi.fn<ParticipantWrite>(),
  updateParticipant: vi.fn<ParticipantWrite>(),
  removeParticipant:
    vi.fn<(eventId: number, personId: number, scope: AccessScope) => Promise<void>>(),
}));

vi.mock('../../shared/auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

vi.mock('../services/event.service.js', () => ({
  eventService: {
    list: listEvents,
    listEventTypes,
    listParticipationTypes,
    addParticipant,
    updateParticipant,
    removeParticipant,
  },
}));

import { createApp } from '../../../app.js';
import { fakeAuthentication } from '../../../test/fake-authentication.js';
import { ROLE_IDS } from '../../shared/person/domain/role-ids.js';

const emptyPage: Paginated<EventResponse> = { items: [], page: 1, pageSize: 50, total: 0 };

describe('listagem da agenda', () => {
  beforeEach(() => {
    fakeAuthentication.signInAs(ROLE_IDS.secretary);
    listEvents.mockReset();
  });

  it('aplica a paginação padrão quando nada é informado', async () => {
    listEvents.mockResolvedValueOnce(emptyPage);

    const response = await request(createApp()).get('/agenda/events');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(emptyPage);
    expect(listEvents.mock.calls[0]?.[0]).toEqual({ page: 1, pageSize: 50 });
  });

  it('converte os filtros da query string', async () => {
    listEvents.mockResolvedValueOnce(emptyPage);

    await request(createApp()).get(
      '/agenda/events?homeId=2&personId=40&eventTypeId=3&from=2026-10-01T00:00:00-03:00&to=2026-11-01T00:00:00-03:00&page=2&pageSize=200',
    );

    expect(listEvents.mock.calls[0]?.[0]).toEqual({
      homeId: 2,
      personId: 40,
      eventTypeId: 3,
      from: '2026-10-01T00:00:00-03:00',
      to: '2026-11-01T00:00:00-03:00',
      page: 2,
      pageSize: 200,
    });
  });

  it.each([
    ['cuidador', ROLE_IDS.caregiver, { kind: 'homes', homeIds: [1] }],
    ['motorista', ROLE_IDS.driver, { kind: 'participant', personId: 7 }],
  ])('deixa o %s listar, com o escopo dele', async (_label, roleId, expectedFilter) => {
    fakeAuthentication.signInAs(roleId, [1]);
    listEvents.mockResolvedValueOnce(emptyPage);

    const response = await request(createApp()).get('/agenda/events');

    expect(response.status).toBe(200);
    expect(listEvents.mock.calls[0]?.[1].eventFilter()).toEqual(expectedFilter);
  });

  it('lista os tipos de compromisso para qualquer papel que lê a agenda', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.driver);
    listEventTypes.mockResolvedValueOnce([{ id: 1, name: 'Consulta médica' }]);

    const response = await request(createApp()).get('/agenda/event-types');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, name: 'Consulta médica' }]);
  });

  it('lista os tipos de participação para qualquer papel que lê a agenda', async () => {
    fakeAuthentication.signInAs(ROLE_IDS.driver);
    listParticipationTypes.mockResolvedValueOnce([{ id: 4, description: 'Motorista' }]);

    const response = await request(createApp()).get('/agenda/participation-types');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 4, description: 'Motorista' }]);
  });
});

describe('participantes do compromisso', () => {
  const participantPath = '/agenda/events/3/participants/40';

  beforeEach(() => {
    fakeAuthentication.signInAs(ROLE_IDS.secretary);
    addParticipant.mockReset().mockResolvedValue(undefined);
    updateParticipant.mockReset().mockResolvedValue(undefined);
    removeParticipant.mockReset().mockResolvedValue(undefined);
  });

  it('adiciona a pessoa e responde 201', async () => {
    const response = await request(createApp())
      .post(participantPath)
      .send({ participationTypeId: 4 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Pessoa adicionada ao compromisso com sucesso' });
    expect(addParticipant.mock.calls[0]?.slice(0, 3)).toEqual([3, 40, { participationTypeId: 4 }]);
  });

  it.each(['put', 'patch'] as const)('troca o tipo de participação com %s', async (method) => {
    const response = await request(createApp())[method](participantPath).send({
      participationTypeId: 1,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Participação atualizada com sucesso' });
    expect(updateParticipant.mock.calls[0]?.slice(0, 3)).toEqual([
      3,
      40,
      { participationTypeId: 1 },
    ]);
  });

  it('remove a pessoa do compromisso', async () => {
    const response = await request(createApp()).delete(participantPath);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Pessoa removida do compromisso com sucesso' });
    expect(removeParticipant.mock.calls[0]?.slice(0, 2)).toEqual([3, 40]);
  });
});
