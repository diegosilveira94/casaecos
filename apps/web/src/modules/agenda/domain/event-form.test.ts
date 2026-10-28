import { describe, expect, it } from 'vitest';

import type { EventResponse, PersonResponse } from '@casaecos/shared-types';

import { toOffsetIsoString } from './calendar-dates.js';
import {
  emptyEventForm,
  eventFormFrom,
  hasEventFormChanges,
  participantChanges,
  participantsLeftBehind,
  toEventConflictRequest,
  toEventRequest,
  validateEventForm,
  type EventFormValues,
} from './event-form.js';

const consultation: EventResponse = {
  id: 7,
  title: 'Consulta pediátrica',
  description: 'Levar a carteirinha de vacinação.',
  startDate: new Date(2026, 9, 1, 9, 0).toISOString(),
  endDate: new Date(2026, 9, 1, 10, 0).toISOString(),
  address: 'UBS Paranaguamirim',
  eventType: { id: 1, name: 'Consulta médica' },
  home: { id: 2, name: 'Casa Fé' },
  participants: [
    {
      person: { id: 5, name: 'João Pedro' },
      participationType: { id: 2, description: 'Participante' },
    },
  ],
  createdAt: new Date(2026, 8, 1).toISOString(),
  updatedAt: new Date(2026, 8, 1).toISOString(),
};

const filled: EventFormValues = eventFormFrom(consultation);

describe('eventFormFrom', () => {
  it('abre o compromisso nos valores dos campos, no fuso do aparelho', () => {
    expect(filled).toEqual({
      title: 'Consulta pediátrica',
      eventTypeId: 1,
      homeId: 2,
      startDay: '2026-10-01',
      startTime: '09:00',
      endTime: '10:00',
      endsOnAnotherDay: false,
      endDay: '',
      address: 'UBS Paranaguamirim',
      description: 'Levar a carteirinha de vacinação.',
      participants: [{ personId: 5, name: 'João Pedro', participationTypeId: 2 }],
    });
  });

  it('marca "termina em outro dia" quando o término cai em outra data', () => {
    const camp = eventFormFrom({
      ...consultation,
      startDate: new Date(2026, 9, 16, 18, 0).toISOString(),
      endDate: new Date(2026, 9, 17, 12, 0).toISOString(),
    });

    expect(camp).toMatchObject({ endsOnAnotherDay: true, endDay: '2026-10-17', endTime: '12:00' });
  });

  it('deixa o término em branco quando o compromisso não tem', () => {
    expect(eventFormFrom({ ...consultation, endDate: null })).toMatchObject({
      endTime: '',
      endsOnAnotherDay: false,
    });
  });
});

describe('emptyEventForm', () => {
  it('começa no dia escolhido na agenda e na casa já selecionada', () => {
    expect(emptyEventForm(new Date(2026, 9, 3), 2)).toMatchObject({
      startDay: '2026-10-03',
      homeId: 2,
      title: '',
      eventTypeId: null,
      participants: [],
    });
  });
});

describe('validateEventForm', () => {
  it('aceita o formulário preenchido', () => {
    expect(validateEventForm(filled)).toEqual({});
  });

  it('aponta cada campo obrigatório em branco', () => {
    expect(
      validateEventForm({ ...emptyEventForm(new Date(2026, 9, 1), null), startDay: '' }),
    ).toEqual({
      title: 'Informe o título.',
      eventTypeId: 'Escolha o tipo de compromisso.',
      startDay: 'Informe a data.',
      startTime: 'Informe o horário.',
      homeId: 'Escolha a casa.',
    });
  });

  it('não aceita título só com espaços', () => {
    expect(validateEventForm({ ...filled, title: '   ' })).toEqual({ title: 'Informe o título.' });
  });

  it('exige o término depois do início no mesmo dia', () => {
    expect(validateEventForm({ ...filled, endTime: '09:00' })).toEqual({
      endTime: 'O término deve ser depois do início.',
    });
  });

  it('exige data e horário de término quando termina em outro dia', () => {
    const anotherDay = { ...filled, endsOnAnotherDay: true };

    expect(validateEventForm({ ...anotherDay, endDay: '', endTime: '' })).toEqual({
      endDay: 'Informe a data de término.',
    });
    expect(validateEventForm({ ...anotherDay, endDay: '2026-10-02', endTime: '' })).toEqual({
      endTime: 'Informe o horário.',
    });
    expect(validateEventForm({ ...anotherDay, endDay: '2026-09-30', endTime: '10:00' })).toEqual({
      endDay: 'O término deve ser depois do início.',
    });
    expect(validateEventForm({ ...anotherDay, endDay: '2026-10-02', endTime: '08:00' })).toEqual(
      {},
    );
  });
});

describe('toEventRequest', () => {
  it('manda as datas com o fuso e apara os textos', () => {
    expect(toEventRequest({ ...filled, title: '  Consulta  ', address: ' UBS ' })).toEqual({
      title: 'Consulta',
      eventTypeId: 1,
      homeId: 2,
      startDate: toOffsetIsoString(new Date(2026, 9, 1, 9, 0)),
      endDate: toOffsetIsoString(new Date(2026, 9, 1, 10, 0)),
      address: 'UBS',
      description: 'Levar a carteirinha de vacinação.',
    });
  });

  it('manda null no que ficou em branco, para limpar o que estava salvo', () => {
    expect(
      toEventRequest({ ...filled, endTime: '', address: '  ', description: '' }),
    ).toMatchObject({ endDate: null, address: null, description: null });
  });

  it('usa a data de término quando termina em outro dia', () => {
    const request = toEventRequest({
      ...filled,
      endsOnAnotherDay: true,
      endDay: '2026-10-02',
      endTime: '08:00',
    });

    expect(request.endDate).toBe(toOffsetIsoString(new Date(2026, 9, 2, 8, 0)));
  });

  it('recusa um formulário que não passou pela validação', () => {
    expect(() => toEventRequest({ ...filled, homeId: null })).toThrow();
  });
});

describe('toEventConflictRequest', () => {
  it('leva o intervalo, os participantes e o id excluído na edição', () => {
    expect(toEventConflictRequest(filled, 7)).toEqual({
      startDate: toOffsetIsoString(new Date(2026, 9, 1, 9, 0)),
      endDate: toOffsetIsoString(new Date(2026, 9, 1, 10, 0)),
      participantIds: [5],
      excludedEventId: 7,
    });
  });
});

describe('hasEventFormChanges', () => {
  it('só acusa alteração quando algum valor muda', () => {
    expect(hasEventFormChanges(filled, { ...filled })).toBe(false);
    expect(hasEventFormChanges(filled, { ...filled, title: 'Outra consulta' })).toBe(true);
    expect(hasEventFormChanges(filled, { ...filled, participants: [] })).toBe(true);
  });
});

describe('participantChanges', () => {
  it('separa quem entra, quem troca de papel e quem sai', () => {
    const saved = [
      {
        person: { id: 5, name: 'João Pedro' },
        participationType: { id: 2, description: 'Participante' },
      },
      {
        person: { id: 4, name: 'Carlos Lima' },
        participationType: { id: 4, description: 'Motorista' },
      },
      {
        person: { id: 2, name: 'Ana Souza' },
        participationType: { id: 3, description: 'Responsável' },
      },
    ];
    const wanted = [
      { personId: 5, name: 'João Pedro', participationTypeId: 2 },
      { personId: 2, name: 'Ana Souza', participationTypeId: 1 },
      { personId: 6, name: 'Lucas Gabriel', participationTypeId: 2 },
    ];

    expect(participantChanges(saved, wanted)).toEqual({
      toAdd: [{ personId: 6, name: 'Lucas Gabriel', participationTypeId: 2 }],
      toUpdate: [{ personId: 2, name: 'Ana Souza', participationTypeId: 1 }],
      toRemove: [4],
    });
  });
});

describe('participantsLeftBehind', () => {
  const person = (id: number, name: string): PersonResponse => ({
    id,
    name,
    role: { id: 5, description: 'Acolhido' },
    individualRegistration: null,
    phone: null,
    createdAt: consultation.createdAt,
    updatedAt: consultation.updatedAt,
  });

  it('tira quem é da casa antiga e não é da nova, e mantém os demais', () => {
    const participants = [
      { personId: 5, name: 'João Pedro', participationTypeId: 2 },
      { personId: 4, name: 'Carlos Lima', participationTypeId: 4 },
      { personId: 9, name: 'Paula Reis', participationTypeId: 1 },
    ];
    const oldHome = [person(5, 'João Pedro'), person(4, 'Carlos Lima')];
    const newHome = [person(4, 'Carlos Lima'), person(7, 'Maria Clara')];

    expect(participantsLeftBehind(participants, oldHome, newHome)).toEqual([
      { personId: 5, name: 'João Pedro', participationTypeId: 2 },
    ]);
  });
});
