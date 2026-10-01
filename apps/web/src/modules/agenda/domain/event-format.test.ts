import { describe, expect, it } from 'vitest';

import type { EventResponse } from '@casaecos/shared-types';

import {
  formatDayHeading,
  formatDayLabel,
  formatTimeRange,
  groupEventsByDay,
  participantNames,
} from './event-format.js';
import { eventToneFor } from './event-tone.js';

const at = (day: number, hour: number, minute = 0): string =>
  new Date(2026, 8, day, hour, minute).toISOString();

function makeEvent(overrides: Partial<EventResponse>): EventResponse {
  return {
    id: 1,
    title: 'Consulta pediátrica',
    description: null,
    startDate: at(30, 9),
    endDate: null,
    address: null,
    eventType: { id: 1, name: 'Consulta médica' },
    home: { id: 1, name: 'Casa Esperança' },
    participants: [],
    createdAt: at(1, 8),
    updatedAt: at(1, 8),
    ...overrides,
  };
}

describe('formatTimeRange', () => {
  it('mostra só o início quando não há término', () => {
    expect(formatTimeRange({ startDate: at(30, 9), endDate: null })).toBe('09:00');
  });

  it('mostra início e fim no mesmo dia', () => {
    expect(formatTimeRange({ startDate: at(30, 9), endDate: at(30, 10, 30) })).toBe(
      '09:00 – 10:30',
    );
  });

  it('inclui a data do término quando ele cai em outro dia', () => {
    expect(formatTimeRange({ startDate: at(29, 22), endDate: at(30, 7) })).toBe(
      '22:00 – 30/09 07:00',
    );
  });
});

describe('formatDayHeading', () => {
  const today = new Date(2026, 8, 30);

  it('marca o dia de hoje', () => {
    expect(formatDayHeading(today, today)).toBe('Hoje · quarta-feira, 30 de setembro');
  });

  it('capitaliza os outros dias', () => {
    expect(formatDayHeading(new Date(2026, 9, 1), today)).toBe('Quinta-feira, 1 de outubro');
  });
});

describe('formatDayLabel', () => {
  it.each([
    [0, '30 de setembro, nenhum compromisso'],
    [1, '30 de setembro, 1 compromisso'],
    [3, '30 de setembro, 3 compromissos'],
  ])('descreve o dia com %i compromisso(s)', (count, label) => {
    expect(formatDayLabel(new Date(2026, 8, 30), count)).toBe(label);
  });
});

describe('groupEventsByDay', () => {
  it('agrupa pelo dia local do início, mantendo a ordem da API', () => {
    const events = [
      makeEvent({ id: 1, startDate: at(29, 23, 30) }),
      makeEvent({ id: 2, startDate: at(30, 7) }),
      makeEvent({ id: 3, startDate: at(30, 14) }),
    ];

    const groups = groupEventsByDay(events);

    expect(groups.get('2026-09-29')?.map(({ id }) => id)).toEqual([1]);
    expect(groups.get('2026-09-30')?.map(({ id }) => id)).toEqual([2, 3]);
  });
});

describe('participantNames', () => {
  it('lista os nomes na ordem da API', () => {
    const event = makeEvent({
      participants: [
        {
          person: { id: 2, name: 'Ana' },
          participationType: { id: 2, description: 'Participante' },
        },
        {
          person: { id: 3, name: 'Carlos' },
          participationType: { id: 4, description: 'Motorista' },
        },
      ],
    });

    expect(participantNames(event)).toBe('Ana, Carlos');
  });
});

describe('eventToneFor', () => {
  it('dá a cor pelo id do tipo e cai no neutro para tipo sem cor', () => {
    expect(eventToneFor(1)).toBe('health');
    expect(eventToneFor(6)).toBe('neutral');
    expect(eventToneFor(99)).toBe('neutral');
  });
});
