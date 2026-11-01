import { describe, expect, it } from 'vitest';

import type {
  EventParticipantResponse,
  EventResponse,
  PersonResponse,
} from '@casaecos/shared-types';

import { AgendaMessage, eventsForAudience, type AgendaAudience } from './agenda-message.js';
import { sendPeriodFor } from './send-period.js';

const TODAY = new Date(2026, 10, 4);
const AFTERNOON = new Date(2026, 10, 4, 15, 0);
const TOMORROW = sendPeriodFor('tomorrow', TODAY);
const NEXT_SEVEN_DAYS = sendPeriodFor('nextSevenDays', TODAY);

const at = (day: number, hour: number, minute = 0): string =>
  new Date(2026, 10, day, hour, minute).toISOString();

function makePerson(id: number, name: string, roleId: number): PersonResponse {
  return {
    id,
    name,
    role: { id: roleId, description: 'Papel' },
    individualRegistration: null,
    phone: null,
    hasAccount: false,
    createdAt: at(1, 8),
    updatedAt: at(1, 8),
  };
}

const bia = makePerson(10, 'Bia Ramos', 5);
const tomas = makePerson(11, 'Tomás Alves', 5);
const anaClara = makePerson(12, 'Ana Clara Dias', 5);
const anaBeatriz = makePerson(13, 'Ana Beatriz Luz', 5);
const marta = makePerson(20, 'Marta Dias', 3);
const carlos = makePerson(21, 'Carlos Lima', 4);
const people = [bia, tomas, anaClara, anaBeatriz, marta, carlos];

const sheltered = (person: PersonResponse): EventParticipantResponse => ({
  person: { id: person.id, name: person.name },
  participationType: { id: 2, description: 'Participante' },
});
const responsible = (person: PersonResponse): EventParticipantResponse => ({
  person: { id: person.id, name: person.name },
  participationType: { id: 3, description: 'Responsável' },
});
const driver = (person: PersonResponse): EventParticipantResponse => ({
  person: { id: person.id, name: person.name },
  participationType: { id: 4, description: 'Motorista' },
});

function makeEvent(overrides: Partial<EventResponse>): EventResponse {
  return {
    id: 1,
    title: 'Escola Aurora',
    description: null,
    startDate: at(5, 7, 30),
    endDate: null,
    address: null,
    eventType: { id: 2, name: 'Escola' },
    home: { id: 1, name: 'Casa 1' },
    participants: [],
    createdAt: at(1, 8),
    updatedAt: at(1, 8),
    ...overrides,
  };
}

const school = makeEvent({ participants: [sheltered(bia), sheltered(tomas), driver(carlos)] });
const therapy = makeEvent({
  id: 2,
  title: 'Terapia',
  description: 'Passar na escola antes do atendimento.',
  address: 'Rua das Flores, 120',
  startDate: at(5, 9),
  home: { id: 2, name: 'Casa 2' },
  participants: [sheltered(anaClara), responsible(marta), driver(carlos)],
});
const visit = makeEvent({
  id: 3,
  title: 'Visita no núcleo',
  startDate: at(5, 15),
  home: { id: 2, name: 'Casa 2' },
  participants: [sheltered(anaBeatriz)],
});
const events = [school, therapy, visit];

function build(
  audience: AgendaAudience,
  messageEvents: EventResponse[] = events,
  period = TOMORROW,
  now = AFTERNOON,
): string | null {
  return new AgendaMessage(audience, people).build(messageEvents, period, now);
}

describe('AgendaMessage', () => {
  it('monta a mensagem geral com um coração por casa e o acolhido antes do compromisso', () => {
    expect(build({ kind: 'general' })).toBe(
      [
        'Boa tarde! 🔴 *AGENDA DE QUINTA-FEIRA 05/11/26*',
        '',
        '💛 *CASA 1*',
        '➡️ Às 07:30',
        '* BIA e TOMÁS: Escola Aurora',
        '',
        '💙 *CASA 2*',
        '➡️ Às 09:00',
        '* ANA CLARA: Terapia (Marta acompanha)',
        'Passar na escola antes do atendimento.',
        '',
        '➡️ Às 15:00',
        '* ANA BEATRIZ: Visita no núcleo',
      ].join('\n'),
    );
  });

  it('monta a mensagem dos motoristas só com quem tem motorista, com o endereço', () => {
    expect(build({ kind: 'drivers' })).toBe(
      [
        'Boa tarde! 🔴 *AGENDA DE QUINTA-FEIRA 05/11/26*',
        '*MOTORISTAS*',
        '',
        '➡️ Às 07:30',
        '* Escola Aurora: BIA e TOMÁS',
        '',
        '➡️ Às 09:00',
        '* Terapia: ANA CLARA (Marta acompanha)',
        'Passar na escola antes do atendimento.',
        '📍 Rua das Flores, 120',
      ].join('\n'),
    );
  });

  it('cumprimenta a pessoa pelo nome e a trata por "você" quando ela acompanha', () => {
    const message = build({ kind: 'person', person: { id: marta.id, name: marta.name } });

    expect(message).toContain('Boa tarde, Marta! 🔴');
    expect(message).toContain('* Terapia: ANA CLARA (você acompanha)');
    expect(message).not.toContain('Escola Aurora');
  });

  it('separa os dias com título quando o período tem mais de um', () => {
    const nextDay = makeEvent({ id: 4, title: 'Oficina', startDate: at(6, 10) });

    expect(build({ kind: 'general' }, [school, nextDay], NEXT_SEVEN_DAYS)).toBe(
      [
        'Boa tarde! 🔴 *AGENDA DE 04/11 A 10/11*',
        '',
        '*QUINTA-FEIRA 05/11*',
        '',
        '💛 *CASA 1*',
        '➡️ Às 07:30',
        '* BIA e TOMÁS: Escola Aurora',
        '',
        '*SEXTA-FEIRA 06/11*',
        '',
        '💛 *CASA 1*',
        '➡️ Às 10:00',
        '* Oficina',
      ].join('\n'),
    );
  });

  it('agrupa compromissos da mesma hora', () => {
    const sameTime = makeEvent({ id: 5, title: 'Natação', participants: [driver(carlos)] });

    expect(build({ kind: 'drivers' }, [school, sameTime])).toBe(
      [
        'Boa tarde! 🔴 *AGENDA DE QUINTA-FEIRA 05/11/26*',
        '*MOTORISTAS*',
        '',
        '➡️ Às 07:30',
        '* Escola Aurora: BIA e TOMÁS',
        '* Natação',
      ].join('\n'),
    );
  });

  it('não trata como acolhido quem tem outro papel, mesmo como participante', () => {
    const meeting = makeEvent({ title: 'Reunião', participants: [sheltered(marta)] });
    const message = build({ kind: 'general' }, [meeting]);

    expect(message).toContain('* Reunião');
    expect(message).not.toContain('MARTA');
  });

  it('usa o nome até onde ele deixa de ser igual ao de outro acolhido', () => {
    const sameTwoNames = makePerson(14, 'Ana Clara Lopes', 5);
    const event = makeEvent({ participants: [sheltered(anaClara)] });
    const message = new AgendaMessage({ kind: 'general' }, [...people, sameTwoNames]).build(
      [event],
      TOMORROW,
      AFTERNOON,
    );

    expect(message).toContain('ANA CLARA DIAS: Escola Aurora');
  });

  it('muda o cumprimento conforme a hora', () => {
    const morning = new Date(2026, 10, 4, 9, 0);
    const night = new Date(2026, 10, 4, 19, 0);

    expect(build({ kind: 'general' }, events, TOMORROW, morning)).toMatch(/^Bom dia!/);
    expect(build({ kind: 'general' }, events, TOMORROW, night)).toMatch(/^Boa noite!/);
  });

  it('devolve null quando não há o que enviar', () => {
    expect(build({ kind: 'general' }, [])).toBeNull();
    expect(build({ kind: 'drivers' }, [visit])).toBeNull();
    expect(build({ kind: 'person', person: { id: 99, name: 'Ninguém' } })).toBeNull();
  });
});

describe('eventsForAudience', () => {
  it('filtra pelo público', () => {
    expect(eventsForAudience(events, { kind: 'general' })).toEqual(events);
    expect(eventsForAudience(events, { kind: 'drivers' })).toEqual([school, therapy]);
    expect(
      eventsForAudience(events, { kind: 'person', person: { id: bia.id, name: bia.name } }),
    ).toEqual([school]);
  });
});
