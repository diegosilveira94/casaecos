import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventResponse } from '@casaecos/shared-types';

import { toOffsetIsoString } from '../domain/calendar-dates.js';
import type { EventFormValues } from '../domain/event-form.js';
import { EventFormSaver, EventParticipantsSaveError } from './event-form-saver.js';
import type { EventService } from './event-service.js';

const values: EventFormValues = {
  title: 'Consulta pediátrica',
  eventTypeId: 1,
  homeId: 2,
  startDay: '2026-10-01',
  startTime: '09:00',
  endTime: '',
  endsOnAnotherDay: false,
  endDay: '',
  address: '',
  description: '',
  participants: [
    { personId: 5, name: 'João Pedro', participationTypeId: 2 },
    { personId: 2, name: 'Ana Souza', participationTypeId: 3 },
  ],
};

const request = {
  title: 'Consulta pediátrica',
  eventTypeId: 1,
  homeId: 2,
  startDate: toOffsetIsoString(new Date(2026, 9, 1, 9, 0)),
  endDate: null,
  address: null,
  description: null,
};

function storedEvent(participants: EventResponse['participants']): EventResponse {
  return {
    id: 7,
    title: 'Consulta pediátrica',
    description: null,
    startDate: request.startDate,
    endDate: null,
    address: null,
    eventType: { id: 1, name: 'Consulta médica' },
    home: { id: 2, name: 'Casa Fé' },
    participants,
    createdAt: request.startDate,
    updatedAt: request.startDate,
  };
}

const events = {
  create: vi.fn<EventService['create']>(),
  update: vi.fn<EventService['update']>(),
  addParticipant: vi.fn<EventService['addParticipant']>(),
  updateParticipant: vi.fn<EventService['updateParticipant']>(),
  removeParticipant: vi.fn<EventService['removeParticipant']>(),
};
const saver = new EventFormSaver(events as unknown as EventService);

describe('EventFormSaver', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    events.addParticipant.mockResolvedValue({ message: 'ok' });
    events.updateParticipant.mockResolvedValue({ message: 'ok' });
    events.removeParticipant.mockResolvedValue({ message: 'ok' });
  });

  it('cria o compromisso e depois vincula cada pessoa', async () => {
    events.create.mockResolvedValue(storedEvent([]));

    await expect(saver.save(null, values)).resolves.toMatchObject({ id: 7 });

    expect(events.create).toHaveBeenCalledWith(request);
    expect(events.update).not.toHaveBeenCalled();
    expect(events.addParticipant.mock.calls).toEqual([
      [7, 5, { participationTypeId: 2 }],
      [7, 2, { participationTypeId: 3 }],
    ]);
  });

  it('atualiza o compromisso e só manda as pessoas que mudaram', async () => {
    events.update.mockResolvedValue(
      storedEvent([
        {
          person: { id: 5, name: 'João Pedro' },
          participationType: { id: 2, description: 'Participante' },
        },
        {
          person: { id: 2, name: 'Ana Souza' },
          participationType: { id: 1, description: 'Organizador' },
        },
        {
          person: { id: 4, name: 'Carlos Lima' },
          participationType: { id: 4, description: 'Motorista' },
        },
      ]),
    );

    await saver.save(7, values);

    expect(events.update).toHaveBeenCalledWith(7, request);
    expect(events.create).not.toHaveBeenCalled();
    expect(events.removeParticipant.mock.calls).toEqual([[7, 4]]);
    expect(events.updateParticipant.mock.calls).toEqual([[7, 2, { participationTypeId: 3 }]]);
    expect(events.addParticipant).not.toHaveBeenCalled();
  });

  it('avisa com o id quando o compromisso foi salvo mas as pessoas não', async () => {
    events.create.mockResolvedValue(storedEvent([]));
    events.addParticipant.mockRejectedValue(new Error('offline'));

    const failure = await saver.save(null, values).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(EventParticipantsSaveError);
    expect((failure as EventParticipantsSaveError).eventId).toBe(7);
  });

  it('repassa o erro quando o próprio compromisso não foi salvo', async () => {
    const offline = new Error('offline');
    events.create.mockRejectedValue(offline);

    await expect(saver.save(null, values)).rejects.toBe(offline);
    expect(events.addParticipant).not.toHaveBeenCalled();
  });
});
