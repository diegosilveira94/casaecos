import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventResponse, EventTypeResponse, Paginated } from '@casaecos/shared-types';

import type { AccessScope } from '../../shared/auth/domain/access-scope.js';
import type { ListEventsRequest } from '../services/event.service.js';

const { listEvents, listEventTypes } = vi.hoisted(() => ({
  listEvents:
    vi.fn<(request: ListEventsRequest, scope: AccessScope) => Promise<Paginated<EventResponse>>>(),
  listEventTypes: vi.fn<() => Promise<EventTypeResponse[]>>(),
}));

vi.mock('../../shared/auth/middlewares/authenticate.js', async (importOriginal) => {
  const { fakeAuthentication } = await import('../../../test/fake-authentication.js');
  return { ...(await importOriginal<object>()), authenticate: fakeAuthentication };
});

vi.mock('../services/event.service.js', () => ({
  eventService: { list: listEvents, listEventTypes },
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
      '/agenda/events?homeId=2&eventTypeId=3&from=2026-10-01T00:00:00-03:00&to=2026-11-01T00:00:00-03:00&page=2&pageSize=200',
    );

    expect(listEvents.mock.calls[0]?.[0]).toEqual({
      homeId: 2,
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
});
